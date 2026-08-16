import { type Locale } from '@/lib/i18n/routing';
import { getTrustCenterPage, type TrustPage } from './content';
import { TRUST_CENTER_ROUTES, type TrustCenterSlug } from './routes';

type TrustPageTranslation = Omit<TrustPage, 'slug' | 'updated'>;

export type TrustCenterUiCopy = {
  trust: string;
  security: string;
  privacy: string;
  status: string;
  proofBadges: [string, string, string];
  lastUpdated: string;
  portal: string;
};

const uiCopy: Record<Locale, TrustCenterUiCopy> = {
  en: {
    trust: 'Trust Center',
    security: 'Security',
    privacy: 'Privacy',
    status: 'Status',
    proofBadges: ['Security review', 'Procurement diligence', 'Evidence preparation'],
    lastUpdated: 'Last updated',
    portal: 'Trust portal',
  },
  pt: {
    trust: 'Centro de Confiança',
    security: 'Segurança',
    privacy: 'Privacidade',
    status: 'Estado',
    proofBadges: ['Revisão de segurança', 'Diligência de compras', 'Preparação de evidências'],
    lastUpdated: 'Última atualização',
    portal: 'Portal de confiança',
  },
  es: {
    trust: 'Centro de confianza',
    security: 'Seguridad',
    privacy: 'Privacidad',
    status: 'Estado',
    proofBadges: ['Revisión de seguridad', 'Diligencia de compras', 'Preparación de evidencias'],
    lastUpdated: 'Última actualización',
    portal: 'Portal de confianza',
  },
  fr: {
    trust: 'Centre de confiance',
    security: 'Sécurité',
    privacy: 'Confidentialité',
    status: 'État',
    proofBadges: ['Revue de sécurité', 'Diligence achats', 'Préparation des preuves'],
    lastUpdated: 'Dernière mise à jour',
    portal: 'Portail de confiance',
  },
  it: {
    trust: 'Centro fiducia',
    security: 'Sicurezza',
    privacy: 'Privacy',
    status: 'Stato',
    proofBadges: ['Revisione sicurezza', 'Due diligence acquisti', 'Preparazione evidenze'],
    lastUpdated: 'Ultimo aggiornamento',
    portal: 'Portale fiducia',
  },
  de: {
    trust: 'Trust Center',
    security: 'Sicherheit',
    privacy: 'Datenschutz',
    status: 'Status',
    proofBadges: ['Sicherheitsprüfung', 'Beschaffungsprüfung', 'Nachweisvorbereitung'],
    lastUpdated: 'Zuletzt aktualisiert',
    portal: 'Vertrauensportal',
  },
};

const pt: Record<TrustCenterSlug, TrustPageTranslation> = {
  trust: {
    navLabel: 'Centro de Confiança',
    title: 'Centro de Confiança',
    subtitle: 'Informação pública sobre segurança, privacidade, tratamento de dados e divulgação responsável para revisão por clientes.',
    status: 'Garantia pública transparente. Não são alegadas certificações, auditorias ou garantias jurídicas sem evidência.',
    sections: [
      { title: 'Visão geral de segurança', body: 'A RISCK COMPLY foi concebida como uma plataforma SaaS B2B para operações de governação de IA e apoio à preparação para o AI Act. Utiliza espaços de trabalho autenticados, registos por organização, padrões de acesso baseados em funções, atividade de auditoria e fornecedores cloud geridos.' },
      { title: 'Resumo da arquitetura', body: 'O produto é uma aplicação Next.js suportada por autenticação, base de dados, armazenamento e operações do lado do servidor geridos. Os registos dos clientes são modelados em torno de organizações e recursos associados a cada organização.', bullets: ['Rotas públicas localizadas para revisão por clientes', 'Rotas autenticadas da aplicação para clientes', 'Verificações no servidor antes de consultar dados da organização', 'Fornecedores geridos para alojamento, autenticação, base de dados e armazenamento'] },
      { title: 'Limitações atuais', body: 'O pacote de garantias é intencionalmente conservador.', bullets: ['Ainda não existe relatório SOC 2.', 'A certificação ISO 27001 ainda não está concluída.', 'Ainda não existe um relatório concluído de avaliação de segurança por terceiros.', 'Não é feita qualquer promessa pública de monitorização humana 24/7.', 'Este material não constitui aconselhamento jurídico nem garante conformidade.'] },
    ],
  },
  security: {
    navLabel: 'Segurança',
    title: 'Segurança',
    subtitle: 'Controlos de aplicação e infraestrutura utilizados para proteger os espaços de trabalho dos clientes.',
    status: 'Divulgação da postura de segurança. A garantia externa formal continua pendente.',
    sections: [
      { title: 'Controlo de acesso', body: 'O acesso ao espaço de trabalho é autenticado e concebido em torno da pertença à organização, funções e limites de consulta aplicados no servidor.' },
      { title: 'Isolamento entre clientes', body: 'Os dados dos clientes são concebidos para permanecer associados a organization_id. Políticas geridas da base de dados e verificações de organização no servidor reduzem o risco de acesso entre organizações.' },
      { title: 'Encriptação', body: 'A encriptação em trânsito é fornecida por HTTPS/TLS através do alojamento gerido e das ligações aos fornecedores. A encriptação em repouso é gerida pelos fornecedores de infraestrutura quando disponível. A RISCK COMPLY não alega encriptação ponta a ponta.' },
      { title: 'Registos de auditoria', body: 'Os eventos relevantes para segurança e conformidade são concebidos para ser registados para revisão e investigação. Os registos de auditoria não devem ser apresentados como externamente imutáveis sem evidência separada.' },
      { title: 'Cópias de segurança e disponibilidade', body: 'As cópias de segurança e a disponibilidade dependem das capacidades dos fornecedores geridos e da configuração de produção. Testes de restauro e evidência formal de recuperação de desastre continuam no roteiro de garantias.' },
      { title: 'Resposta a incidentes', body: 'Os incidentes devem ser triados de forma privada, avaliados quanto ao impacto no cliente, comunicados com clareza quando necessário e acompanhados por ações corretivas.' },
    ],
  },
  privacy: {
    navLabel: 'Privacidade',
    title: 'Aviso de Privacidade',
    subtitle: 'Como a RISCK COMPLY descreve o tratamento de dados pessoais para utilizadores, clientes e revisores.',
    status: 'Aviso público. A redação aplicável ao cliente deve ser revista antes da assinatura.',
    sections: [
      { title: 'Dados tratados', body: 'O serviço pode tratar dados de conta, perfil da organização, membros, inventário de sistemas de IA, entradas de risco e preparação, metadados de documentos gerados, comunicações de suporte e registos técnicos de segurança.' },
      { title: 'Finalidades', body: 'Os dados são tratados para fornecer o SaaS, autenticar utilizadores, manter espaços de trabalho, gerar resultados de preparação, proteger o serviço, suportar faturação e responder a pedidos dos clientes.' },
      { title: 'Conservação', body: 'Os dados do espaço de trabalho são conservados enquanto a conta estiver ativa ou conforme necessário para suporte, segurança, faturação, obrigações legais e auditoria. Os procedimentos de exportação e eliminação devem ser confirmados contratualmente para clientes enterprise.' },
    ],
  },
  terms: {
    navLabel: 'Termos',
    title: 'Termos de Serviço',
    subtitle: 'Termos públicos de base para a utilização da RISCK COMPLY.',
    status: 'Termos de modelo. Não substituem os termos jurídicos assinados.',
    sections: [
      { title: 'Âmbito do serviço', body: 'A RISCK COMPLY fornece fluxos de software para governação de IA, preparação de evidências, geração de documentos e acompanhamento operacional de conformidade. Não substitui assessoria jurídica, DPOs ou responsáveis de conformidade e não garante resultados de conformidade.' },
      { title: 'Utilização aceitável', body: 'Os utilizadores não podem abusar do serviço, tentar acesso não autorizado, submeter conteúdo malicioso nem utilizar a plataforma para violar a lei ou direitos de terceiros.' },
      { title: 'Dados do cliente', body: 'Os clientes mantêm a responsabilidade pela exatidão, legalidade e adequação dos dados que submetem. A RISCK COMPLY utiliza os dados do cliente para fornecer e proteger o serviço.' },
    ],
  },
  dpa: {
    navLabel: 'DPA',
    title: 'Adenda de Tratamento de Dados (DPA)',
    subtitle: 'Resumo de apoio a compras sobre compromissos esperados de tratamento de dados.',
    status: 'Resumo do DPA. O acordo final exige revisão jurídica e assinatura.',
    sections: [
      { title: 'Funções', body: 'Para dados do espaço de trabalho do cliente, espera-se em geral que o cliente atue como responsável pelo tratamento e a RISCK COMPLY como subcontratante. As funções específicas podem variar conforme a funcionalidade e o contrato.' },
      { title: 'Instruções de tratamento', body: 'A RISCK COMPLY trata dados pessoais do cliente para fornecer, proteger, manter e suportar o SaaS de acordo com as instruções do cliente e os termos do acordo aplicável.' },
      { title: 'Medidas de segurança', body: 'As medidas incluem acesso autenticado, separação por organização, encriptação dos fornecedores geridos, atividade de auditoria, acesso administrativo restrito e canais de divulgação responsável.' },
    ],
  },
  subprocessors: {
    navLabel: 'Subcontratantes',
    title: 'Subcontratantes',
    subtitle: 'Fornecedores utilizados para entregar, proteger, alojar, faturar e operar o serviço.',
    status: 'Registo público. Confirme a configuração de produção antes da assinatura.',
    sections: [
      { title: 'Categorias principais', body: 'A RISCK COMPLY pode utilizar fornecedores geridos para alojamento, base de dados, autenticação, armazenamento, pagamentos, email, análise de produto, monitorização, suporte ao cliente e relatórios de erros.' },
      { title: 'Fornecedores previstos', body: 'A implementação referencia serviços geridos como Vercel, Supabase, Stripe, Sentry, PostHog e fornecedores de email/suporte quando configurados. A utilização real orientada ao cliente depende da configuração do ambiente.' },
      { title: 'Revisão pelo cliente', body: 'Clientes enterprise podem solicitar a lista ativa de subcontratantes antes da assinatura. As alterações devem ser comunicadas de acordo com o DPA ou acordo enterprise aplicável.' },
    ],
  },
  sla: {
    navLabel: 'SLA',
    title: 'Compromissos de Serviço',
    subtitle: 'Linguagem de disponibilidade e suporte sem promessas 24/7 não comprovadas.',
    status: 'Declaração pública de serviço. SLA contratual apenas por acordo assinado.',
    sections: [
      { title: 'Abordagem à disponibilidade', body: 'A RISCK COMPLY foi concebida para utilizar fornecedores geridos de alojamento e infraestrutura. As páginas públicas não prometem um SLA numérico de disponibilidade, salvo quando um plano ou acordo enterprise assinado o estabelecer.' },
      { title: 'Suporte', body: 'Os tempos de resposta dependem do plano do cliente e da capacidade operacional. Nesta fase, a RISCK COMPLY não promete publicamente suporte humano 24/7.' },
      { title: 'Manutenção', body: 'Manutenção planeada, atualizações de incidentes e avisos de serviço degradado devem ser comunicados pela superfície de estado ou diretamente ao cliente quando aplicável.' },
    ],
  },
  status: {
    navLabel: 'Estado',
    title: 'Estado do Sistema',
    subtitle: 'Superfície pública simples para disponibilidade do serviço e incidentes.',
    status: 'Página de estado estática. Integração de monitorização em tempo real pendente.',
    sections: [
      { title: 'Estado público atual', body: 'Ainda não existe uma integração pública de estado com terceiros nesta página. A equipa de produção deve atualizar esta página ou ligá-la a um fornecedor dedicado antes de depender dela para comunicação externa de incidentes.' },
      { title: 'Componentes a acompanhar', body: 'Os componentes recomendados incluem aplicação web, autenticação, base de dados, armazenamento, geração de documentos, faturação, entrega de email e dependências externas.' },
      { title: 'Atualizações de incidentes', body: 'As atualizações devem indicar componentes afetados, impacto no cliente, mitigação, resolução e ações de seguimento sem expor detalhes sensíveis de segurança.' },
    ],
  },
  'data-processing': {
    navLabel: 'Tratamento de Dados',
    title: 'Tratamento de Dados',
    subtitle: 'Visão operacional dos dados tratados pela plataforma.',
    status: 'Visão geral do tratamento. Exportação e eliminação conforme acordo aplicável.',
    sections: [
      { title: 'Categorias de dados', body: 'A plataforma pode tratar dados de identidade do utilizador, organização, membros e funções, descrições de sistemas de IA, entradas de classificação de risco, metadados de documentos gerados, eventos de auditoria, referências de faturação e registos de suporte.' },
      { title: 'Minimização de dados', body: 'Os clientes devem fornecer apenas a informação necessária para operar o fluxo de preparação. Dados pessoais sensíveis não devem ser introduzidos salvo quando necessários e contratualmente permitidos.' },
      { title: 'Acesso e segregação', body: 'Os registos dos clientes são concebidos em torno de organization_id e acesso autenticado. O acesso administrativo deve ser limitado, registado quando possível e utilizado apenas para necessidades operacionais.' },
    ],
  },
  'vulnerability-disclosure': {
    navLabel: 'Divulgação de Vulnerabilidades',
    title: 'Divulgação de Vulnerabilidades',
    subtitle: 'Como clientes e revisores de segurança podem comunicar problemas de forma segura e privada.',
    status: 'Canal de divulgação responsável ativo. Atualmente não é oferecido um programa público de recompensas.',
    sections: [
      { title: 'Contacto para reporte', body: 'Envie relatórios de segurança em privado para renansilva2002@gmail.com até existir uma caixa de correio de segurança dedicada.' },
      { title: 'O que incluir', body: 'Os relatórios devem indicar o componente afetado, contexto claro de reprodução, impacto no negócio, contexto da conta ou organização e se dados de clientes podem ter sido afetados.' },
      { title: 'Limites da investigação', body: 'Os relatórios devem limitar-se a investigação segura e autorizada e não podem interromper o serviço nem aceder a dados que não pertençam ao investigador.' },
      { title: 'Limitações de resposta', body: 'A RISCK COMPLY não opera atualmente um programa público de recompensas, não promete resposta 24/7 e não garante recompensas monetárias.' },
    ],
  },
};

const es: Record<TrustCenterSlug, TrustPageTranslation> = {
  trust: {
    navLabel: 'Centro de confianza', title: 'Centro de confianza', subtitle: 'Información pública sobre seguridad, privacidad, tratamiento de datos y divulgación responsable para la revisión de clientes.', status: 'Garantía pública transparente. No se declaran certificaciones, auditorías ni garantías legales sin evidencia.',
    sections: [
      { title: 'Resumen de seguridad', body: 'RISCK COMPLY está diseñada como una plataforma SaaS B2B para operaciones de gobernanza de IA y apoyo a la preparación para el AI Act. Utiliza espacios de trabajo autenticados, registros por organización, patrones de acceso basados en roles, actividad de auditoría y proveedores cloud gestionados.' },
      { title: 'Resumen de arquitectura', body: 'El producto es una aplicación Next.js respaldada por autenticación, base de datos, almacenamiento y operaciones de servidor gestionadas. Los registros de clientes se modelan alrededor de organizaciones y recursos asociados a cada organización.', bullets: ['Rutas públicas localizadas para revisión de clientes', 'Rutas autenticadas de la aplicación para clientes', 'Comprobaciones del servidor antes de consultar datos de la organización', 'Proveedores gestionados para alojamiento, autenticación, base de datos y almacenamiento'] },
      { title: 'Limitaciones actuales', body: 'El paquete de garantías es intencionadamente conservador.', bullets: ['Todavía no hay un informe SOC 2 disponible.', 'La certificación ISO 27001 aún no está completada.', 'Todavía no existe un informe final de evaluación de seguridad por terceros.', 'No se hace ninguna promesa pública de monitorización humana 24/7.', 'Este material no constituye asesoramiento jurídico ni garantiza cumplimiento.'] },
    ],
  },
  security: {
    navLabel: 'Seguridad', title: 'Seguridad', subtitle: 'Controles de aplicación e infraestructura utilizados para proteger los espacios de trabajo de los clientes.', status: 'Divulgación de la postura de seguridad. La garantía externa formal sigue pendiente.',
    sections: [
      { title: 'Control de acceso', body: 'El acceso al espacio de trabajo está autenticado y se diseña en torno a la pertenencia a la organización, los roles y los límites de consulta aplicados en el servidor.' },
      { title: 'Aislamiento entre clientes', body: 'Los datos de clientes están diseñados para quedar asociados a organization_id. Las políticas gestionadas de base de datos y las comprobaciones de organización en el servidor reducen el riesgo de acceso entre organizaciones.' },
      { title: 'Cifrado', body: 'El cifrado en tránsito se proporciona mediante HTTPS/TLS a través del alojamiento gestionado y las conexiones con proveedores. El cifrado en reposo lo gestionan los proveedores de infraestructura cuando está disponible. RISCK COMPLY no afirma cifrado de extremo a extremo.' },
      { title: 'Registros de auditoría', body: 'Los eventos relevantes para seguridad y cumplimiento están diseñados para registrarse con fines de revisión e investigación. Los registros no deben presentarse como externamente inmutables sin evidencia independiente.' },
      { title: 'Copias de seguridad y disponibilidad', body: 'Las copias de seguridad y la disponibilidad dependen de las capacidades de los proveedores gestionados y de la configuración de producción. Las pruebas de restauración y la evidencia formal de recuperación ante desastres siguen en la hoja de ruta.' },
      { title: 'Respuesta a incidentes', body: 'Los incidentes deben clasificarse de forma privada, evaluarse por impacto en clientes, comunicarse con claridad cuando corresponda y seguirse con acciones correctivas.' },
    ],
  },
  privacy: {
    navLabel: 'Privacidad', title: 'Aviso de Privacidad', subtitle: 'Cómo describe RISCK COMPLY el tratamiento de datos personales para usuarios, clientes y revisores.', status: 'Aviso público. El texto aplicable al cliente debe revisarse antes de la firma.',
    sections: [
      { title: 'Datos tratados', body: 'El servicio puede tratar datos de cuenta, perfil de organización, miembros, inventario de sistemas de IA, entradas de riesgo y preparación, metadatos de documentos generados, comunicaciones de soporte y registros técnicos de seguridad.' },
      { title: 'Finalidades', body: 'Los datos se tratan para prestar el SaaS, autenticar usuarios, mantener espacios de trabajo, generar resultados de preparación, proteger el servicio, gestionar facturación y responder a solicitudes de clientes.' },
      { title: 'Conservación', body: 'Los datos del espacio de trabajo se conservan mientras la cuenta esté activa o cuando sean necesarios para soporte, seguridad, facturación, obligaciones legales y auditoría. Los procedimientos de exportación y borrado deben confirmarse contractualmente para clientes enterprise.' },
    ],
  },
  terms: {
    navLabel: 'Términos', title: 'Términos del Servicio', subtitle: 'Términos públicos de base para utilizar RISCK COMPLY.', status: 'Términos de plantilla. No sustituyen las condiciones jurídicas firmadas.',
    sections: [
      { title: 'Alcance del servicio', body: 'RISCK COMPLY ofrece flujos de software para gobernanza de IA, preparación de evidencias, generación de documentos y seguimiento operativo del cumplimiento. No sustituye al asesoramiento jurídico, DPOs o responsables de cumplimiento y no garantiza resultados de cumplimiento.' },
      { title: 'Uso aceptable', body: 'Los usuarios no pueden abusar del servicio, intentar accesos no autorizados, enviar contenido malicioso ni utilizar la plataforma para infringir la ley o derechos de terceros.' },
      { title: 'Datos del cliente', body: 'Los clientes mantienen la responsabilidad sobre la exactitud, legalidad e idoneidad de los datos que envían. RISCK COMPLY utiliza los datos del cliente para prestar y proteger el servicio.' },
    ],
  },
  dpa: {
    navLabel: 'DPA', title: 'Anexo de Tratamiento de Datos (DPA)', subtitle: 'Resumen para compras sobre los compromisos previstos de tratamiento de datos.', status: 'Resumen del DPA. El acuerdo final requiere revisión jurídica y firma.',
    sections: [
      { title: 'Roles', body: 'Para los datos del espacio de trabajo del cliente, generalmente se espera que el cliente actúe como responsable y RISCK COMPLY como encargado del tratamiento. Los roles concretos pueden variar según la función y el contrato.' },
      { title: 'Instrucciones de tratamiento', body: 'RISCK COMPLY trata datos personales del cliente para prestar, proteger, mantener y dar soporte al SaaS de acuerdo con las instrucciones del cliente y los términos del acuerdo aplicable.' },
      { title: 'Medidas de seguridad', body: 'Las medidas incluyen acceso autenticado, separación por organización, cifrado de proveedores gestionados, actividad de auditoría, acceso administrativo restringido y canales de divulgación responsable.' },
    ],
  },
  subprocessors: {
    navLabel: 'Subencargados', title: 'Subencargados', subtitle: 'Proveedores utilizados para prestar, proteger, alojar, facturar y operar el servicio.', status: 'Registro público. Verifique la configuración de producción antes de la firma.',
    sections: [
      { title: 'Categorías principales', body: 'RISCK COMPLY puede utilizar proveedores gestionados para alojamiento, base de datos, autenticación, almacenamiento, pagos, correo electrónico, analítica de producto, monitorización, soporte al cliente e informes de errores.' },
      { title: 'Proveedores previstos', body: 'La implementación referencia servicios gestionados como Vercel, Supabase, Stripe, Sentry, PostHog y proveedores de correo/soporte cuando están configurados. El uso real de cara al cliente depende de la configuración del entorno.' },
      { title: 'Revisión del cliente', body: 'Los clientes enterprise pueden solicitar la lista activa de subencargados antes de la firma. Los cambios deben comunicarse conforme al DPA o acuerdo enterprise aplicable.' },
    ],
  },
  sla: {
    navLabel: 'SLA', title: 'Compromisos de Servicio', subtitle: 'Lenguaje sobre disponibilidad y soporte sin promesas 24/7 no demostradas.', status: 'Declaración pública del servicio. SLA contractual únicamente mediante acuerdo firmado.',
    sections: [
      { title: 'Enfoque de disponibilidad', body: 'RISCK COMPLY está diseñada para utilizar proveedores gestionados de alojamiento e infraestructura. Las páginas públicas no prometen un SLA numérico de disponibilidad salvo que un plan o acuerdo enterprise firmado lo establezca.' },
      { title: 'Soporte', body: 'Los tiempos de respuesta dependen del plan del cliente y de la capacidad operativa. En esta fase RISCK COMPLY no promete públicamente soporte humano 24/7.' },
      { title: 'Mantenimiento', body: 'El mantenimiento programado, las actualizaciones de incidentes y los avisos de servicio degradado deben comunicarse mediante la superficie de estado o directamente al cliente cuando corresponda.' },
    ],
  },
  status: {
    navLabel: 'Estado', title: 'Estado del Sistema', subtitle: 'Superficie pública sencilla para la disponibilidad del servicio y los incidentes.', status: 'Página de estado estática. Integración de monitorización en tiempo real pendiente.',
    sections: [
      { title: 'Estado público actual', body: 'Todavía no hay una integración pública de estado con terceros en esta página. El equipo de producción debe actualizarla o conectarla a un proveedor dedicado antes de depender de ella para la comunicación externa de incidentes.' },
      { title: 'Componentes a seguir', body: 'Los componentes recomendados incluyen aplicación web, autenticación, base de datos, almacenamiento, generación de documentos, facturación, entrega de correo y dependencias externas.' },
      { title: 'Actualizaciones de incidentes', body: 'Las actualizaciones deben describir componentes afectados, impacto en clientes, mitigación, resolución y acciones de seguimiento sin exponer detalles sensibles de seguridad.' },
    ],
  },
  'data-processing': {
    navLabel: 'Tratamiento de Datos', title: 'Tratamiento de Datos', subtitle: 'Vista operativa de los datos tratados por la plataforma.', status: 'Resumen del tratamiento. Exportación y borrado según el acuerdo aplicable.',
    sections: [
      { title: 'Categorías de datos', body: 'La plataforma puede tratar datos de identidad de usuario, organización, miembros y roles, descripciones de sistemas de IA, entradas de clasificación de riesgo, metadatos de documentos generados, eventos de auditoría, referencias de facturación y registros de soporte.' },
      { title: 'Minimización de datos', body: 'Los clientes deben proporcionar únicamente la información necesaria para operar el flujo de preparación. Los datos personales sensibles no deben introducirse salvo que sean necesarios y estén permitidos contractualmente.' },
      { title: 'Acceso y segregación', body: 'Los registros de clientes están diseñados alrededor de organization_id y acceso autenticado. El acceso administrativo debe limitarse, registrarse cuando sea posible y utilizarse solo para necesidades operativas.' },
    ],
  },
  'vulnerability-disclosure': {
    navLabel: 'Divulgación de Vulnerabilidades', title: 'Divulgación de Vulnerabilidades', subtitle: 'Cómo pueden clientes y revisores de seguridad comunicar problemas de forma segura y privada.', status: 'Canal de divulgación responsable activo. Actualmente no se ofrece un programa público de recompensas.',
    sections: [
      { title: 'Contacto para informar', body: 'Envíe informes de seguridad de forma privada a renansilva2002@gmail.com hasta que exista un buzón de seguridad dedicado.' },
      { title: 'Qué incluir', body: 'Los informes deben incluir componente afectado, contexto claro de reproducción, impacto empresarial, contexto de cuenta u organización y si los datos de clientes pueden haberse visto afectados.' },
      { title: 'Límites de investigación', body: 'Los informes deben limitarse a investigación segura y autorizada y no pueden interrumpir el servicio ni acceder a datos que no pertenezcan al investigador.' },
      { title: 'Limitaciones de respuesta', body: 'RISCK COMPLY no opera actualmente un programa público de recompensas, no promete respuesta 24/7 ni garantiza compensaciones económicas.' },
    ],
  },
};

const fr: Record<TrustCenterSlug, TrustPageTranslation> = {
  trust: {
    navLabel: 'Centre de confiance', title: 'Centre de confiance', subtitle: 'Informations publiques sur la sécurité, la confidentialité, le traitement des données et la divulgation responsable pour l’examen des clients.', status: 'Assurance publique transparente. Aucune certification, aucun audit ni aucune garantie juridique ne sont revendiqués sans preuve.',
    sections: [
      { title: 'Vue d’ensemble de la sécurité', body: 'RISCK COMPLY est conçue comme une plateforme SaaS B2B pour les opérations de gouvernance de l’IA et l’aide à la préparation à l’AI Act. Elle utilise des espaces de travail authentifiés, des enregistrements par organisation, des accès fondés sur les rôles, une activité d’audit et des fournisseurs cloud gérés.' },
      { title: 'Résumé de l’architecture', body: 'Le produit est une application Next.js reposant sur une authentification, une base de données, un stockage et des opérations serveur gérés. Les données clients sont structurées autour des organisations et de leurs ressources.', bullets: ['Routes publiques localisées pour l’examen client', 'Routes applicatives authentifiées pour les clients', 'Contrôles serveur avant toute requête sur les données de l’organisation', 'Fournisseurs gérés pour l’hébergement, l’authentification, la base de données et le stockage'] },
      { title: 'Limites actuelles', body: 'Le périmètre d’assurance reste volontairement conservateur.', bullets: ['Aucun rapport SOC 2 n’est encore disponible.', 'La certification ISO 27001 n’est pas encore achevée.', 'Aucun rapport final d’évaluation de sécurité par un tiers n’est encore disponible.', 'Aucune promesse publique de surveillance humaine 24/7 n’est faite.', 'Ce document ne constitue pas un conseil juridique et ne garantit pas la conformité.'] },
    ],
  },
  security: {
    navLabel: 'Sécurité', title: 'Sécurité', subtitle: 'Contrôles applicatifs et d’infrastructure utilisés pour protéger les espaces de travail des clients.', status: 'Présentation de la posture de sécurité. L’assurance externe formelle reste en attente.',
    sections: [
      { title: 'Contrôle d’accès', body: 'L’accès aux espaces de travail est authentifié et conçu autour de l’appartenance à l’organisation, des rôles et des limites de requête appliquées côté serveur.' },
      { title: 'Isolation des clients', body: 'Les données clients sont conçues pour rester associées à organization_id. Les politiques gérées de base de données et les contrôles d’organisation côté serveur réduisent le risque d’accès entre organisations.' },
      { title: 'Chiffrement', body: 'Le chiffrement en transit est assuré par HTTPS/TLS via l’hébergement géré et les connexions fournisseurs. Le chiffrement au repos est géré par les fournisseurs d’infrastructure lorsqu’il est disponible. RISCK COMPLY ne revendique pas de chiffrement de bout en bout.' },
      { title: 'Journaux d’audit', body: 'Les événements pertinents pour la sécurité et la conformité sont conçus pour être consignés à des fins de revue et d’enquête. Ils ne doivent pas être présentés comme immuables à l’extérieur sans preuve distincte.' },
      { title: 'Sauvegardes et disponibilité', body: 'Les sauvegardes et la disponibilité dépendent des capacités des fournisseurs gérés et de la configuration de production. Les tests de restauration et la preuve formelle de reprise après sinistre restent sur la feuille de route.' },
      { title: 'Réponse aux incidents', body: 'Les incidents doivent être triés de manière privée, évalués selon leur impact client, communiqués clairement lorsque nécessaire et suivis d’actions correctives.' },
    ],
  },
  privacy: {
    navLabel: 'Confidentialité', title: 'Avis de confidentialité', subtitle: 'Comment RISCK COMPLY décrit le traitement des données personnelles des utilisateurs, clients et évaluateurs.', status: 'Avis public. La formulation applicable au client doit être revue avant signature.',
    sections: [
      { title: 'Données traitées', body: 'Le service peut traiter des données de compte, de profil d’organisation, d’adhésion, d’inventaire des systèmes d’IA, des données de risque et de préparation, des métadonnées de documents générés, des communications de support et des journaux techniques de sécurité.' },
      { title: 'Finalités', body: 'Les données sont traitées pour fournir le SaaS, authentifier les utilisateurs, maintenir les espaces de travail, produire les résultats de préparation, sécuriser le service, gérer la facturation et répondre aux demandes clients.' },
      { title: 'Conservation', body: 'Les données de l’espace de travail sont conservées tant que le compte est actif ou si nécessaire pour le support, la sécurité, la facturation, les obligations juridiques et l’audit. Les procédures d’exportation et de suppression doivent être confirmées contractuellement pour les clients enterprise.' },
    ],
  },
  terms: {
    navLabel: 'Conditions', title: 'Conditions d’utilisation', subtitle: 'Conditions publiques de base pour utiliser RISCK COMPLY.', status: 'Conditions modèles. Elles ne remplacent pas les conditions juridiques signées.',
    sections: [
      { title: 'Périmètre du service', body: 'RISCK COMPLY fournit des flux logiciels pour la gouvernance de l’IA, la préparation des preuves, la génération de documents et le suivi opérationnel de la conformité. La plateforme ne remplace pas un conseil juridique, les DPO ou les responsables conformité et ne garantit aucun résultat de conformité.' },
      { title: 'Utilisation acceptable', body: 'Les utilisateurs ne doivent pas abuser du service, tenter un accès non autorisé, soumettre du contenu malveillant ni utiliser la plateforme pour enfreindre la loi ou les droits de tiers.' },
      { title: 'Données client', body: 'Les clients restent responsables de l’exactitude, de la légalité et de la pertinence des données soumises. RISCK COMPLY utilise les données client pour fournir et sécuriser le service.' },
    ],
  },
  dpa: {
    navLabel: 'DPA', title: 'Avenant relatif au traitement des données (DPA)', subtitle: 'Résumé destiné aux achats des engagements attendus en matière de traitement des données.', status: 'Résumé du DPA. L’accord final nécessite une revue juridique et une signature.',
    sections: [
      { title: 'Rôles', body: 'Pour les données de l’espace de travail client, le client est généralement appelé à agir comme responsable du traitement et RISCK COMPLY comme sous-traitant. Les rôles précis peuvent varier selon la fonctionnalité et le contrat.' },
      { title: 'Instructions de traitement', body: 'RISCK COMPLY traite les données personnelles du client pour fournir, sécuriser, maintenir et prendre en charge le SaaS conformément aux instructions du client et à l’accord applicable.' },
      { title: 'Mesures de sécurité', body: 'Les mesures comprennent l’accès authentifié, la séparation par organisation, le chiffrement des fournisseurs gérés, l’activité d’audit, l’accès administratif restreint et les canaux de divulgation responsable.' },
    ],
  },
  subprocessors: {
    navLabel: 'Sous-traitants ultérieurs', title: 'Sous-traitants ultérieurs', subtitle: 'Fournisseurs utilisés pour délivrer, sécuriser, héberger, facturer et exploiter le service.', status: 'Registre public. Vérifiez la configuration de production avant signature.',
    sections: [
      { title: 'Catégories principales', body: 'RISCK COMPLY peut utiliser des fournisseurs gérés pour l’hébergement, la base de données, l’authentification, le stockage, les paiements, l’email, l’analyse produit, la surveillance, le support client et les rapports d’erreur.' },
      { title: 'Fournisseurs prévus', body: 'L’implémentation référence des services gérés tels que Vercel, Supabase, Stripe, Sentry, PostHog et des fournisseurs d’email/support lorsqu’ils sont configurés. L’usage réel côté client dépend de la configuration de l’environnement.' },
      { title: 'Examen client', body: 'Les clients enterprise peuvent demander la liste active des sous-traitants avant signature. Les changements doivent être communiqués conformément au DPA ou à l’accord enterprise applicable.' },
    ],
  },
  sla: {
    navLabel: 'SLA', title: 'Engagements de service', subtitle: 'Langage relatif à la disponibilité et au support sans promesse 24/7 non étayée.', status: 'Déclaration publique de service. SLA contractuel uniquement par accord signé.',
    sections: [
      { title: 'Approche de disponibilité', body: 'RISCK COMPLY est conçue pour utiliser des fournisseurs gérés d’hébergement et d’infrastructure. Les pages publiques ne promettent aucun SLA numérique de disponibilité, sauf si un plan ou un accord enterprise signé en prévoit un.' },
      { title: 'Support', body: 'Les délais de réponse dépendent du plan client et de la capacité opérationnelle. À ce stade, RISCK COMPLY ne promet pas publiquement de support humain 24/7.' },
      { title: 'Maintenance', body: 'Les maintenances planifiées, les mises à jour d’incident et les avis de service dégradé doivent être communiqués via la surface d’état ou directement au client lorsque cela s’applique.' },
    ],
  },
  status: {
    navLabel: 'État', title: 'État du système', subtitle: 'Surface publique simple pour la disponibilité du service et les incidents.', status: 'Page d’état statique. Intégration de surveillance en temps réel en attente.',
    sections: [
      { title: 'État public actuel', body: 'Aucune intégration publique d’état avec un tiers n’est encore connectée à cette page. L’équipe de production doit la mettre à jour ou la relier à un fournisseur dédié avant de s’y fier pour la communication externe d’incidents.' },
      { title: 'Composants à suivre', body: 'Les composants recommandés incluent l’application web, l’authentification, la base de données, le stockage, la génération de documents, la facturation, l’envoi d’emails et les dépendances externes.' },
      { title: 'Mises à jour d’incident', body: 'Les mises à jour doivent décrire les composants affectés, l’impact client, la mitigation, la résolution et les actions de suivi sans exposer de détails de sécurité sensibles.' },
    ],
  },
  'data-processing': {
    navLabel: 'Traitement des données', title: 'Traitement des données', subtitle: 'Vue opérationnelle des données traitées par la plateforme.', status: 'Vue d’ensemble du traitement. Exportation et suppression selon l’accord applicable.',
    sections: [
      { title: 'Catégories de données', body: 'La plateforme peut traiter des données d’identité utilisateur, d’organisation, d’adhésion et de rôles, des descriptions de systèmes d’IA, des entrées de classification des risques, des métadonnées de documents générés, des événements d’audit, des références de facturation et des dossiers de support.' },
      { title: 'Minimisation des données', body: 'Les clients doivent fournir uniquement les informations nécessaires au flux de préparation. Les données personnelles sensibles ne doivent pas être saisies sauf nécessité et autorisation contractuelle.' },
      { title: 'Accès et séparation', body: 'Les enregistrements clients sont conçus autour de organization_id et d’un accès authentifié. L’accès administratif doit être limité, journalisé lorsque possible et utilisé uniquement pour les besoins opérationnels.' },
    ],
  },
  'vulnerability-disclosure': {
    navLabel: 'Divulgation de vulnérabilités', title: 'Divulgation de vulnérabilités', subtitle: 'Comment les clients et évaluateurs de sécurité peuvent signaler des problèmes de manière sûre et privée.', status: 'Canal de divulgation responsable actif. Aucun programme public de récompense n’est actuellement proposé.',
    sections: [
      { title: 'Contact de signalement', body: 'Envoyez les signalements de sécurité en privé à renansilva2002@gmail.com jusqu’à la mise en place d’une boîte de sécurité dédiée.' },
      { title: 'Informations à inclure', body: 'Les signalements doivent inclure le composant affecté, un contexte de reproduction clair, l’impact métier, le contexte du compte ou de l’organisation et l’éventuelle exposition de données clients.' },
      { title: 'Limites de recherche', body: 'Les recherches doivent rester sûres et autorisées, sans perturber le service ni accéder à des données n’appartenant pas au chercheur.' },
      { title: 'Limites de réponse', body: 'RISCK COMPLY n’exploite actuellement aucun programme public de récompense, ne promet pas de réponse 24/7 et ne garantit aucune récompense financière.' },
    ],
  },
};

const it: Record<TrustCenterSlug, TrustPageTranslation> = {
  trust: {
    navLabel: 'Centro fiducia', title: 'Centro fiducia', subtitle: 'Informazioni pubbliche su sicurezza, privacy, trattamento dei dati e divulgazione responsabile per la revisione dei clienti.', status: 'Garanzia pubblica trasparente. Non vengono dichiarate certificazioni, audit o garanzie legali senza evidenza.',
    sections: [
      { title: 'Panoramica della sicurezza', body: 'RISCK COMPLY è progettata come piattaforma SaaS B2B per operazioni di governance dell’IA e supporto alla preparazione per l’AI Act. Utilizza spazi di lavoro autenticati, record per organizzazione, accessi basati sui ruoli, attività di audit e provider cloud gestiti.' },
      { title: 'Sintesi dell’architettura', body: 'Il prodotto è un’applicazione Next.js supportata da autenticazione, database, storage e operazioni server gestiti. I record dei clienti sono modellati attorno alle organizzazioni e alle relative risorse.', bullets: ['Route pubbliche localizzate per la revisione dei clienti', 'Route applicative autenticate per i clienti', 'Controlli server prima di interrogare i dati dell’organizzazione', 'Provider gestiti per hosting, autenticazione, database e storage'] },
      { title: 'Limitazioni attuali', body: 'Il pacchetto di garanzie è volutamente conservativo.', bullets: ['Non è ancora disponibile un report SOC 2.', 'La certificazione ISO 27001 non è ancora completata.', 'Non è ancora disponibile un report finale di valutazione della sicurezza da parte di terzi.', 'Non viene fatta alcuna promessa pubblica di monitoraggio umano 24/7.', 'Questo materiale non è consulenza legale e non garantisce la conformità.'] },
    ],
  },
  security: {
    navLabel: 'Sicurezza', title: 'Sicurezza', subtitle: 'Controlli applicativi e infrastrutturali utilizzati per proteggere gli spazi di lavoro dei clienti.', status: 'Divulgazione della postura di sicurezza. L’assurance esterna formale è ancora in sospeso.',
    sections: [
      { title: 'Controllo degli accessi', body: 'L’accesso allo spazio di lavoro è autenticato e progettato attorno all’appartenenza all’organizzazione, ai ruoli e ai limiti di query applicati sul server.' },
      { title: 'Isolamento tra clienti', body: 'I dati dei clienti sono progettati per restare associati a organization_id. Le policy gestite del database e i controlli dell’organizzazione sul server riducono il rischio di accesso tra organizzazioni.' },
      { title: 'Crittografia', body: 'La crittografia in transito è fornita tramite HTTPS/TLS dall’hosting gestito e dalle connessioni ai provider. La crittografia a riposo è gestita dai provider infrastrutturali quando disponibile. RISCK COMPLY non dichiara crittografia end-to-end.' },
      { title: 'Registri di audit', body: 'Gli eventi rilevanti per sicurezza e conformità sono progettati per essere registrati a fini di revisione e indagine. I registri non devono essere presentati come immutabili esternamente senza evidenza separata.' },
      { title: 'Backup e disponibilità', body: 'Backup e disponibilità dipendono dalle capacità dei provider gestiti e dalla configurazione di produzione. I test di ripristino e l’evidenza formale di disaster recovery restano nella roadmap.' },
      { title: 'Risposta agli incidenti', body: 'Gli incidenti devono essere classificati privatamente, valutati per l’impatto sui clienti, comunicati con chiarezza quando necessario e seguiti da azioni correttive.' },
    ],
  },
  privacy: {
    navLabel: 'Privacy', title: 'Informativa sulla privacy', subtitle: 'Come RISCK COMPLY descrive il trattamento dei dati personali per utenti, clienti e revisori.', status: 'Informativa pubblica. Il testo applicabile al cliente deve essere rivisto prima della firma.',
    sections: [
      { title: 'Dati trattati', body: 'Il servizio può trattare dati dell’account, profilo dell’organizzazione, appartenenza, inventario dei sistemi IA, input di rischio e preparazione, metadati dei documenti generati, comunicazioni di supporto e log tecnici di sicurezza.' },
      { title: 'Finalità', body: 'I dati sono trattati per fornire il SaaS, autenticare gli utenti, mantenere gli spazi di lavoro, generare risultati di preparazione, proteggere il servizio, gestire la fatturazione e rispondere alle richieste dei clienti.' },
      { title: 'Conservazione', body: 'I dati dello spazio di lavoro sono conservati finché l’account è attivo o quando necessario per supporto, sicurezza, fatturazione, obblighi legali e audit. Le procedure di esportazione e cancellazione devono essere confermate contrattualmente per i clienti enterprise.' },
    ],
  },
  terms: {
    navLabel: 'Termini', title: 'Termini di servizio', subtitle: 'Termini pubblici di base per l’utilizzo di RISCK COMPLY.', status: 'Termini modello. Non sostituiscono i termini legali sottoscritti.',
    sections: [
      { title: 'Ambito del servizio', body: 'RISCK COMPLY fornisce flussi software per governance dell’IA, preparazione delle evidenze, generazione di documenti e monitoraggio operativo della conformità. Non sostituisce consulenza legale, DPO o responsabili compliance e non garantisce risultati di conformità.' },
      { title: 'Uso accettabile', body: 'Gli utenti non devono abusare del servizio, tentare accessi non autorizzati, inviare contenuti dannosi o utilizzare la piattaforma per violare la legge o i diritti di terzi.' },
      { title: 'Dati del cliente', body: 'I clienti restano responsabili dell’accuratezza, legalità e adeguatezza dei dati inviati. RISCK COMPLY utilizza i dati del cliente per fornire e proteggere il servizio.' },
    ],
  },
  dpa: {
    navLabel: 'DPA', title: 'Addendum sul trattamento dei dati (DPA)', subtitle: 'Sintesi per gli acquisti degli impegni previsti sul trattamento dei dati.', status: 'Sintesi del DPA. L’accordo finale richiede revisione legale e firma.',
    sections: [
      { title: 'Ruoli', body: 'Per i dati dello spazio di lavoro del cliente, in generale il cliente è previsto come titolare del trattamento e RISCK COMPLY come responsabile del trattamento. I ruoli specifici possono variare per funzionalità e contratto.' },
      { title: 'Istruzioni di trattamento', body: 'RISCK COMPLY tratta i dati personali del cliente per fornire, proteggere, mantenere e supportare il SaaS secondo le istruzioni del cliente e i termini dell’accordo applicabile.' },
      { title: 'Misure di sicurezza', body: 'Le misure includono accesso autenticato, separazione per organizzazione, crittografia dei provider gestiti, attività di audit, accesso amministrativo limitato e canali di divulgazione responsabile.' },
    ],
  },
  subprocessors: {
    navLabel: 'Sub-responsabili', title: 'Sub-responsabili', subtitle: 'Provider utilizzati per erogare, proteggere, ospitare, fatturare e gestire il servizio.', status: 'Registro pubblico. Verificare la configurazione di produzione prima della firma.',
    sections: [
      { title: 'Categorie principali', body: 'RISCK COMPLY può utilizzare provider gestiti per hosting, database, autenticazione, storage, pagamenti, email, analisi prodotto, monitoraggio, supporto clienti e segnalazione degli errori.' },
      { title: 'Provider previsti', body: 'L’implementazione fa riferimento a servizi gestiti come Vercel, Supabase, Stripe, Sentry, PostHog e provider email/supporto quando configurati. L’uso effettivo rivolto al cliente dipende dalla configurazione dell’ambiente.' },
      { title: 'Revisione del cliente', body: 'I clienti enterprise possono richiedere l’elenco attivo dei sub-responsabili prima della firma. Le modifiche devono essere comunicate secondo il DPA o l’accordo enterprise applicabile.' },
    ],
  },
  sla: {
    navLabel: 'SLA', title: 'Impegni di servizio', subtitle: 'Linguaggio su disponibilità e supporto senza promesse 24/7 non supportate da evidenza.', status: 'Dichiarazione pubblica del servizio. SLA contrattuale solo tramite accordo firmato.',
    sections: [
      { title: 'Approccio alla disponibilità', body: 'RISCK COMPLY è progettata per utilizzare provider gestiti di hosting e infrastruttura. Le pagine pubbliche non promettono uno SLA numerico di disponibilità salvo che sia previsto da un piano o accordo enterprise firmato.' },
      { title: 'Supporto', body: 'I tempi di risposta dipendono dal piano del cliente e dalla capacità operativa. In questa fase RISCK COMPLY non promette pubblicamente supporto umano 24/7.' },
      { title: 'Manutenzione', body: 'Manutenzione pianificata, aggiornamenti sugli incidenti e avvisi di servizio degradato devono essere comunicati tramite la superficie di stato o direttamente al cliente quando applicabile.' },
    ],
  },
  status: {
    navLabel: 'Stato', title: 'Stato del sistema', subtitle: 'Superficie pubblica semplice per disponibilità del servizio e incidenti.', status: 'Pagina di stato statica. Integrazione di monitoraggio in tempo reale in sospeso.',
    sections: [
      { title: 'Stato pubblico attuale', body: 'Non è ancora collegata a questa pagina un’integrazione pubblica di stato di terze parti. Il team di produzione deve aggiornare la pagina o collegarla a un provider dedicato prima di usarla come canale esterno per gli incidenti.' },
      { title: 'Componenti da monitorare', body: 'I componenti consigliati includono applicazione web, autenticazione, database, storage, generazione documenti, fatturazione, consegna email e dipendenze esterne.' },
      { title: 'Aggiornamenti sugli incidenti', body: 'Gli aggiornamenti devono descrivere componenti interessati, impatto sui clienti, mitigazione, risoluzione e azioni successive senza esporre dettagli sensibili di sicurezza.' },
    ],
  },
  'data-processing': {
    navLabel: 'Trattamento dei dati', title: 'Trattamento dei dati', subtitle: 'Vista operativa dei dati trattati dalla piattaforma.', status: 'Panoramica del trattamento. Esportazione e cancellazione secondo l’accordo applicabile.',
    sections: [
      { title: 'Categorie di dati', body: 'La piattaforma può trattare dati di identità utente, organizzazione, appartenenza e ruoli, descrizioni di sistemi IA, input di classificazione del rischio, metadati dei documenti generati, eventi di audit, riferimenti di fatturazione e registri di supporto.' },
      { title: 'Minimizzazione dei dati', body: 'I clienti devono fornire solo le informazioni necessarie per il flusso di preparazione. I dati personali sensibili non devono essere inseriti salvo quando necessari e consentiti contrattualmente.' },
      { title: 'Accesso e segregazione', body: 'I record dei clienti sono progettati attorno a organization_id e accesso autenticato. L’accesso amministrativo deve essere limitato, registrato ove possibile e usato solo per esigenze operative.' },
    ],
  },
  'vulnerability-disclosure': {
    navLabel: 'Divulgazione delle vulnerabilità', title: 'Divulgazione delle vulnerabilità', subtitle: 'Come clienti e revisori di sicurezza possono segnalare problemi in modo sicuro e privato.', status: 'Canale di divulgazione responsabile attivo. Attualmente non è offerto un programma pubblico di ricompense.',
    sections: [
      { title: 'Contatto per le segnalazioni', body: 'Inviare privatamente le segnalazioni di sicurezza a renansilva2002@gmail.com fino alla predisposizione di una casella di sicurezza dedicata.' },
      { title: 'Cosa includere', body: 'Le segnalazioni devono includere componente interessato, contesto chiaro di riproduzione, impatto aziendale, contesto dell’account o organizzazione e possibile coinvolgimento dei dati dei clienti.' },
      { title: 'Limiti della ricerca', body: 'La ricerca deve essere sicura e autorizzata, senza interrompere il servizio né accedere a dati che non appartengono al ricercatore.' },
      { title: 'Limiti di risposta', body: 'RISCK COMPLY non gestisce attualmente un programma pubblico di ricompense, non promette risposta 24/7 e non garantisce ricompense economiche.' },
    ],
  },
};

const de: Record<TrustCenterSlug, TrustPageTranslation> = {
  trust: {
    navLabel: 'Trust Center', title: 'Trust Center', subtitle: 'Öffentliche Informationen zu Sicherheit, Datenschutz, Datenverarbeitung und verantwortungsvoller Schwachstellenmeldung für Kundenprüfungen.', status: 'Transparente öffentliche Zusicherung. Zertifizierungen, Audits oder Rechtsgarantien werden ohne Nachweis nicht behauptet.',
    sections: [
      { title: 'Sicherheitsübersicht', body: 'RISCK COMPLY ist als B2B-SaaS-Plattform für KI-Governance und die Vorbereitung auf den AI Act konzipiert. Sie nutzt authentifizierte Arbeitsbereiche, organisationsbezogene Datensätze, rollenbasierte Zugriffsmuster, Audit-Aktivitäten und verwaltete Cloud-Anbieter.' },
      { title: 'Architekturübersicht', body: 'Das Produkt ist eine Next.js-Anwendung mit verwalteter Authentifizierung, Datenbank, Speicherung und serverseitigen Abläufen. Kundendatensätze sind nach Organisationen und organisationsbezogenen Ressourcen strukturiert.', bullets: ['Lokalisierte öffentliche Routen für Kundenprüfungen', 'Authentifizierte Anwendungsrouten für Kunden', 'Serverseitige Prüfungen vor dem Abruf von Organisationsdaten', 'Verwaltete Anbieter für Hosting, Authentifizierung, Datenbank und Speicherung'] },
      { title: 'Aktuelle Einschränkungen', body: 'Der Zusicherungsumfang ist bewusst konservativ.', bullets: ['Ein SOC-2-Bericht ist noch nicht verfügbar.', 'Die ISO-27001-Zertifizierung ist noch nicht abgeschlossen.', 'Ein abgeschlossener Sicherheitsbewertungsbericht eines Dritten liegt noch nicht vor.', 'Eine öffentliche Zusage menschlicher 24/7-Überwachung wird nicht gemacht.', 'Dieses Material ist keine Rechtsberatung und garantiert keine Compliance.'] },
    ],
  },
  security: {
    navLabel: 'Sicherheit', title: 'Sicherheit', subtitle: 'Anwendungs- und Infrastrukturkontrollen zum Schutz von Kundenarbeitsbereichen.', status: 'Offenlegung der Sicherheitslage. Formelle externe Prüfung steht noch aus.',
    sections: [
      { title: 'Zugriffskontrolle', body: 'Der Zugriff auf Arbeitsbereiche ist authentifiziert und basiert auf Organisationsmitgliedschaft, Rollen und serverseitig durchgesetzten Abfragegrenzen.' },
      { title: 'Mandantentrennung', body: 'Kundendaten sind so konzipiert, dass sie organization_id zugeordnet bleiben. Verwaltete Datenbankrichtlinien und serverseitige Organisationsprüfungen reduzieren das Risiko organisationsübergreifender Zugriffe.' },
      { title: 'Verschlüsselung', body: 'Die Verschlüsselung während der Übertragung erfolgt über HTTPS/TLS durch verwaltetes Hosting und Anbieter-Verbindungen. Verschlüsselung im Ruhezustand wird von Infrastruktur-Anbietern bereitgestellt, sofern verfügbar. RISCK COMPLY behauptet keine Ende-zu-Ende-Verschlüsselung.' },
      { title: 'Audit-Protokolle', body: 'Sicherheits- und compliance-relevante Ereignisse sind für Aufzeichnung, Prüfung und Untersuchung ausgelegt. Audit-Protokolle dürfen ohne separaten Nachweis nicht als extern unveränderlich dargestellt werden.' },
      { title: 'Backups und Verfügbarkeit', body: 'Backups und Verfügbarkeit hängen von den Fähigkeiten verwalteter Anbieter und der Produktionskonfiguration ab. Wiederherstellungstests und formelle Disaster-Recovery-Nachweise bleiben Teil der Assurance-Roadmap.' },
      { title: 'Reaktion auf Vorfälle', body: 'Vorfälle sollen vertraulich eingestuft, auf Kundenauswirkungen geprüft, bei Bedarf klar kommuniziert und durch Korrekturmaßnahmen nachverfolgt werden.' },
    ],
  },
  privacy: {
    navLabel: 'Datenschutz', title: 'Datenschutzhinweis', subtitle: 'Wie RISCK COMPLY die Verarbeitung personenbezogener Daten für Nutzer, Kunden und Prüfer beschreibt.', status: 'Öffentlicher Hinweis. Kundenspezifische Formulierungen sollten vor Unterzeichnung geprüft werden.',
    sections: [
      { title: 'Verarbeitete Daten', body: 'Der Dienst kann Kontodaten, Organisationsprofile, Mitgliedschaften, KI-Systeminventare, Risiko- und Readiness-Eingaben, Metadaten erzeugter Dokumente, Support-Kommunikation und technische Sicherheitsprotokolle verarbeiten.' },
      { title: 'Zwecke', body: 'Daten werden verarbeitet, um den SaaS-Dienst bereitzustellen, Nutzer zu authentifizieren, Arbeitsbereiche zu betreiben, Readiness-Ergebnisse zu erzeugen, den Dienst zu schützen, Abrechnung zu unterstützen und Kundenanfragen zu beantworten.' },
      { title: 'Aufbewahrung', body: 'Arbeitsbereichsdaten werden während der aktiven Kontolaufzeit oder soweit für Support, Sicherheit, Abrechnung, rechtliche Pflichten und Audits erforderlich aufbewahrt. Export- und Löschverfahren sind für Enterprise-Kunden vertraglich zu bestätigen.' },
    ],
  },
  terms: {
    navLabel: 'Bedingungen', title: 'Nutzungsbedingungen', subtitle: 'Öffentliche Grundbedingungen für die Nutzung von RISCK COMPLY.', status: 'Musterbedingungen. Sie ersetzen keine unterzeichneten Rechtsbedingungen.',
    sections: [
      { title: 'Leistungsumfang', body: 'RISCK COMPLY bietet Software-Abläufe für KI-Governance, Nachweisvorbereitung, Dokumenterstellung und operative Compliance-Verfolgung. Die Plattform ersetzt keine Rechtsberatung, DPOs oder Compliance-Verantwortlichen und garantiert keine Compliance-Ergebnisse.' },
      { title: 'Zulässige Nutzung', body: 'Nutzer dürfen den Dienst nicht missbrauchen, unbefugten Zugriff versuchen, schädliche Inhalte übermitteln oder die Plattform zur Verletzung von Gesetzen oder Rechten Dritter verwenden.' },
      { title: 'Kundendaten', body: 'Kunden bleiben für Richtigkeit, Rechtmäßigkeit und Angemessenheit der eingereichten Daten verantwortlich. RISCK COMPLY nutzt Kundendaten zur Bereitstellung und Absicherung des Dienstes.' },
    ],
  },
  dpa: {
    navLabel: 'DPA', title: 'Auftragsverarbeitungsvereinbarung (DPA)', subtitle: 'Beschaffungsorientierte Zusammenfassung der erwarteten Verpflichtungen zur Datenverarbeitung.', status: 'DPA-Zusammenfassung. Die endgültige Vereinbarung erfordert rechtliche Prüfung und Unterzeichnung.',
    sections: [
      { title: 'Rollen', body: 'Für Daten im Kundenarbeitsbereich wird der Kunde im Allgemeinen als Verantwortlicher und RISCK COMPLY als Auftragsverarbeiter erwartet. Die konkreten Rollen können je nach Funktion und Vertrag variieren.' },
      { title: 'Verarbeitungsanweisungen', body: 'RISCK COMPLY verarbeitet personenbezogene Kundendaten zur Bereitstellung, Absicherung, Wartung und Unterstützung des SaaS gemäß Kundenanweisungen und den Bedingungen der anwendbaren Vereinbarung.' },
      { title: 'Sicherheitsmaßnahmen', body: 'Zu den Maßnahmen gehören authentifizierter Zugriff, Organisationstrennung, Verschlüsselung durch verwaltete Anbieter, Audit-Aktivität, eingeschränkter administrativer Zugriff und Kanäle für verantwortungsvolle Schwachstellenmeldungen.' },
    ],
  },
  subprocessors: {
    navLabel: 'Unterauftragsverarbeiter', title: 'Unterauftragsverarbeiter', subtitle: 'Anbieter, die zur Bereitstellung, Absicherung, zum Hosting, zur Abrechnung und zum Betrieb des Dienstes eingesetzt werden.', status: 'Öffentliches Register. Produktionskonfiguration vor Unterzeichnung prüfen.',
    sections: [
      { title: 'Kernkategorien', body: 'RISCK COMPLY kann verwaltete Anbieter für Hosting, Datenbank, Authentifizierung, Speicherung, Zahlungen, E-Mail, Produktanalyse, Monitoring, Kundensupport und Fehlerberichte einsetzen.' },
      { title: 'Vorgesehene Anbieter', body: 'Die Implementierung verweist auf verwaltete Dienste wie Vercel, Supabase, Stripe, Sentry, PostHog sowie E-Mail-/Support-Anbieter, sofern konfiguriert. Die tatsächliche kundenseitige Nutzung hängt von der Umgebungskonfiguration ab.' },
      { title: 'Kundenprüfung', body: 'Enterprise-Kunden können vor Unterzeichnung die aktive Liste der Unterauftragsverarbeiter anfordern. Änderungen sollen gemäß anwendbarem DPA oder Enterprise-Vertrag kommuniziert werden.' },
    ],
  },
  sla: {
    navLabel: 'SLA', title: 'Servicezusagen', subtitle: 'Aussagen zu Verfügbarkeit und Support ohne unbelegte 24/7-Versprechen.', status: 'Öffentliche Serviceerklärung. Vertragliches SLA nur durch unterzeichnete Vereinbarung.',
    sections: [
      { title: 'Verfügbarkeitsansatz', body: 'RISCK COMPLY ist für verwaltete Hosting- und Infrastruktur-Anbieter ausgelegt. Öffentliche Seiten versprechen kein numerisches Verfügbarkeits-SLA, sofern nicht ein unterzeichneter Plan oder Enterprise-Vertrag eines festlegt.' },
      { title: 'Support', body: 'Reaktionszeiten hängen vom Kundenplan und der operativen Kapazität ab. RISCK COMPLY verspricht derzeit keinen öffentlichen menschlichen 24/7-Support.' },
      { title: 'Wartung', body: 'Geplante Wartung, Vorfallupdates und Hinweise auf eingeschränkten Dienst sollen über die Statusoberfläche oder, falls erforderlich, direkt an Kunden kommuniziert werden.' },
    ],
  },
  status: {
    navLabel: 'Status', title: 'Systemstatus', subtitle: 'Einfache öffentliche Oberfläche für Dienstverfügbarkeit und Vorfälle.', status: 'Statische Statusseite. Echtzeit-Monitoring-Integration steht noch aus.',
    sections: [
      { title: 'Aktueller öffentlicher Status', body: 'Auf dieser Seite ist noch keine öffentliche Statusintegration eines Drittanbieters angebunden. Das Produktionsteam muss diese Seite aktualisieren oder mit einem dedizierten Anbieter verbinden, bevor sie für externe Vorfallkommunikation als maßgeblich genutzt wird.' },
      { title: 'Zu überwachende Komponenten', body: 'Empfohlene Komponenten sind Webanwendung, Authentifizierung, Datenbank, Speicherung, Dokumenterstellung, Abrechnung, E-Mail-Zustellung und externe Abhängigkeiten.' },
      { title: 'Vorfallupdates', body: 'Updates sollen betroffene Komponenten, Kundenauswirkungen, Mitigation, Lösung und Folgemaßnahmen beschreiben, ohne sensible Sicherheitsdetails offenzulegen.' },
    ],
  },
  'data-processing': {
    navLabel: 'Datenverarbeitung', title: 'Datenverarbeitung', subtitle: 'Operative Übersicht der von der Plattform verarbeiteten Daten.', status: 'Übersicht der Verarbeitung. Export und Löschung gemäß anwendbarer Vereinbarung.',
    sections: [
      { title: 'Datenkategorien', body: 'Die Plattform kann Nutzeridentitätsdaten, Organisationsdaten, Mitgliedschaften und Rollen, Beschreibungen von KI-Systemen, Risikoklassifizierungs-Eingaben, Metadaten erzeugter Dokumente, Audit-Ereignisse, Abrechnungsreferenzen und Support-Datensätze verarbeiten.' },
      { title: 'Datenminimierung', body: 'Kunden sollen nur Informationen bereitstellen, die für den Readiness-Ablauf erforderlich sind. Sensible personenbezogene Daten sollen nur eingegeben werden, wenn dies notwendig und vertraglich zulässig ist.' },
      { title: 'Zugriff und Trennung', body: 'Kundendatensätze sind um organization_id und authentifizierten Zugriff herum konzipiert. Administrativer Zugriff soll begrenzt, soweit möglich protokolliert und nur für operative Anforderungen verwendet werden.' },
    ],
  },
  'vulnerability-disclosure': {
    navLabel: 'Schwachstellenmeldung', title: 'Verantwortungsvolle Schwachstellenmeldung', subtitle: 'Wie Kunden und Sicherheitsprüfer Probleme sicher und vertraulich melden können.', status: 'Kanal für verantwortungsvolle Meldungen aktiv. Ein öffentliches Bug-Bounty-Programm wird derzeit nicht angeboten.',
    sections: [
      { title: 'Meldekontakt', body: 'Sicherheitsmeldungen bitte vertraulich an renansilva2002@gmail.com senden, bis ein dediziertes Sicherheitspostfach eingerichtet ist.' },
      { title: 'Erforderliche Angaben', body: 'Meldungen sollten die betroffene Komponente, klare Reproduktionshinweise, geschäftliche Auswirkungen, Konto- oder Organisationskontext sowie einen möglichen Bezug zu Kundendaten enthalten.' },
      { title: 'Forschungsgrenzen', body: 'Forschung muss sicher und autorisiert bleiben, darf den Dienst nicht stören und nicht auf Daten zugreifen, die dem Forschenden nicht gehören.' },
      { title: 'Reaktionsgrenzen', body: 'RISCK COMPLY betreibt derzeit kein öffentliches Bug-Bounty-Programm, verspricht keine 24/7-Reaktion und garantiert keine finanzielle Belohnung.' },
    ],
  },
};

const localizedPages: Record<Exclude<Locale, 'en'>, Record<TrustCenterSlug, TrustPageTranslation>> = { pt, es, fr, it, de };

export function getTrustCenterUi(locale: Locale): TrustCenterUiCopy {
  return uiCopy[locale] ?? uiCopy.en;
}

export function getLocalizedTrustCenterPage(slug: TrustCenterSlug, locale: Locale): TrustPage {
  const base = getTrustCenterPage(slug, 'en');
  if (locale === 'en') return base;
  const localized = localizedPages[locale][slug];
  return { slug, updated: base.updated, ...localized };
}

export function getLocalizedTrustCenterPages(locale: Locale): TrustPage[] {
  return TRUST_CENTER_ROUTES.map((slug) => getLocalizedTrustCenterPage(slug, locale));
}
