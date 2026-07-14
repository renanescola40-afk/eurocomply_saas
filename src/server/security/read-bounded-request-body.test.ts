import { describe, expect, it, vi } from 'vitest';

import { readBoundedRequestBody } from './read-bounded-request-body';

function requestWithStream(stream: ReadableStream<Uint8Array>, headers?: HeadersInit) {
  return new Request('https://example.test/internal-upload', {
    method: 'POST',
    body: stream,
    headers,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

describe('readBoundedRequestBody', () => {
  it('returns the body when the streamed bytes are within the limit', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });

    const result = await readBoundedRequestBody(requestWithStream(stream), 4);

    expect(result).toEqual({ buffer: Buffer.from([1, 2, 3, 4]) });
  });

  it('rejects an oversized declared length before consuming the stream', async () => {
    const pull = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ pull });

    const result = await readBoundedRequestBody(
      requestWithStream(stream, { 'content-length': '5' }),
      4,
    );

    expect(result).toEqual({ error: 'body_too_large' });
    expect(pull).not.toHaveBeenCalled();
  });

  it('cancels and rejects a chunked body as soon as it crosses the limit', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5]));
      },
      cancel,
    });

    const result = await readBoundedRequestBody(requestWithStream(stream), 4);

    expect(result).toEqual({ error: 'body_too_large' });
    expect(cancel).toHaveBeenCalledWith('body_too_large');
  });

  it('treats an empty stream as an empty body', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });

    await expect(readBoundedRequestBody(requestWithStream(stream), 4)).resolves.toEqual({
      error: 'empty_body',
    });
  });

  it('rejects invalid limits fail closed', async () => {
    const request = new Request('https://example.test/internal-upload', {
      method: 'POST',
      body: new Uint8Array([1]),
    });

    await expect(readBoundedRequestBody(request, 0)).rejects.toThrow(RangeError);
  });
});
