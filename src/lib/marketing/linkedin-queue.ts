import 'server-only';

import {
  LinkedInPublishError,
  publishLinkedInOrganizationTextPost,
} from '@/lib/marketing/linkedin';

const DEFAULT_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 10;

type ClaimedLinkedInPost = {
  id: string;
  body: string;
};

export type LinkedInQueueItemResult = {
  id: string;
  status: 'published' | 'failed' | 'needs_review';
  postId: string | null;
};

export type LinkedInQueueProcessResult = {
  claimed: number;
  published: number;
  failed: number;
  needsReview: number;
  items: LinkedInQueueItemResult[];
};

function normalizeBatchSize(limit?: number) {
  if (!Number.isInteger(limit)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(limit ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE));
}

function normalizeClaimedPosts(value: unknown): ClaimedLinkedInPost[] {
  if (!Array.isArray(value)) {
    throw new Error('LinkedIn marketing queue claim returned an invalid shape');
  }

  return value.map((row) => {
    if (
      typeof row !== 'object' ||
      row === null ||
      typeof (row as { id?: unknown }).id !== 'string' ||
      typeof (row as { body?: unknown }).body !== 'string'
    ) {
      throw new Error('LinkedIn marketing queue claim returned an invalid row');
    }

    return {
      id: (row as { id: string }).id,
      body: (row as { body: string }).body,
    };
  });
}

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/server');
  return supabaseAdmin;
}

async function claimDuePosts(limit: number) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc('claim_linkedin_marketing_posts', {
    p_limit: normalizeBatchSize(limit),
  });

  if (error) {
    throw new Error('Unable to claim LinkedIn marketing queue items');
  }

  return normalizeClaimedPosts(data);
}

async function finalizeQueueItem(
  id: string,
  patch: {
    status: 'published' | 'failed' | 'needs_review';
    linkedin_post_id?: string | null;
    published_at?: string | null;
    last_error_code?: string | null;
  },
) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('linkedin_marketing_posts')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'publishing')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unable to finalize LinkedIn marketing queue item');
  }
}

function classifyPublishFailure(error: unknown) {
  if (error instanceof LinkedInPublishError) {
    if (error.kind === 'upstream_rejected') {
      return {
        status: 'failed' as const,
        errorCode: error.status ? `linkedin_upstream_${error.status}` : 'linkedin_upstream_rejected',
      };
    }

    if (error.kind === 'organization_resolution') {
      return {
        status: 'failed' as const,
        errorCode: error.status
          ? `linkedin_organization_resolution_${error.status}`
          : 'linkedin_organization_resolution',
      };
    }

    if (error.kind === 'configuration') {
      return {
        status: 'failed' as const,
        errorCode: 'linkedin_configuration',
      };
    }

    return {
      status: 'needs_review' as const,
      errorCode: 'linkedin_network_uncertain',
    };
  }

  return {
    status: 'needs_review' as const,
    errorCode: 'linkedin_unknown_uncertain',
  };
}

export async function processLinkedInMarketingQueue(
  limit = DEFAULT_BATCH_SIZE,
): Promise<LinkedInQueueProcessResult> {
  const claimedPosts = await claimDuePosts(limit);
  const items: LinkedInQueueItemResult[] = [];

  for (const post of claimedPosts) {
    try {
      const result = await publishLinkedInOrganizationTextPost({ text: post.body });
      await finalizeQueueItem(post.id, {
        status: 'published',
        linkedin_post_id: result.postId,
        published_at: new Date().toISOString(),
        last_error_code: null,
      });
      items.push({ id: post.id, status: 'published', postId: result.postId });
    } catch (error) {
      const failure = classifyPublishFailure(error);
      await finalizeQueueItem(post.id, {
        status: failure.status,
        last_error_code: failure.errorCode,
      });
      items.push({ id: post.id, status: failure.status, postId: null });
    }
  }

  return {
    claimed: items.length,
    published: items.filter((item) => item.status === 'published').length,
    failed: items.filter((item) => item.status === 'failed').length,
    needsReview: items.filter((item) => item.status === 'needs_review').length,
    items,
  };
}
