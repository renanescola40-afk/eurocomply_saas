import type { Locale } from '@/lib/i18n/routing';

export type ProfileCopy = {
  accountEyebrow: string;
  title: string;
  subtitle: string;
  loading: string;
  unavailableTitle: string;
  unavailableBody: string;
  personalTitle: string;
  personalBody: string;
  emailLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  save: string;
  saving: string;
  invalidName: string;
  nameSaved: string;
  nameSaveError: string;
  languageTitle: string;
  languageBody: string;
  languageLabel: string;
  languageSave: string;
  languageSaving: string;
  languageSaved: string;
  languageSaveError: string;
  securityTitle: string;
  securityBody: string;
  resetPassword: string;
  signOut: string;
  resetEmailMissing: string;
  resetEmailError: string;
  resetEmailSent: string;
  exportTitle: string;
  exportBody: string;
  exportAction: string;
  exportSuccess: string;
  dangerTitle: string;
  dangerBody: string;
  supportAction: string;
};

const en: ProfileCopy = {
  accountEyebrow: 'Account',
  title: 'My profile',
  subtitle: 'Manage your sign-in details, language preference and basic data portability.',
  loading: 'Loading profile…',
  unavailableTitle: 'Profile unavailable',
  unavailableBody: 'Sign in again to manage your account.',
  personalTitle: 'Personal information',
  personalBody: 'These details come from your active account.',
  emailLabel: 'Email',
  nameLabel: 'Name',
  namePlaceholder: 'Your name',
  save: 'Save',
  saving: 'Saving…',
  invalidName: 'Enter a valid name.',
  nameSaved: 'Name updated successfully.',
  nameSaveError: 'We could not update your name right now.',
  languageTitle: 'Communication language',
  languageBody: 'Choose the language Risck Comply should use for account and operational email presentation when the sender supports recipient preferences.',
  languageLabel: 'Preferred language',
  languageSave: 'Save language',
  languageSaving: 'Saving language…',
  languageSaved: 'Communication language updated.',
  languageSaveError: 'We could not update your communication language right now.',
  securityTitle: 'Account security',
  securityBody: 'Send a password recovery email or end the current session.',
  resetPassword: 'Send password recovery',
  signOut: 'Sign out',
  resetEmailMissing: 'Email is unavailable for password recovery.',
  resetEmailError: 'We could not send the recovery email right now.',
  resetEmailSent: 'Recovery email sent.',
  exportTitle: 'Export my data',
  exportBody: 'Download a copy of your basic account data in JSON format.',
  exportAction: 'Export data',
  exportSuccess: 'Data exported successfully.',
  dangerTitle: 'Danger zone',
  dangerBody: 'For account deletion, contact support. This action requires secure confirmation.',
  supportAction: 'Contact support',
};

const pt: ProfileCopy = {
  accountEyebrow: 'Conta',
  title: 'O meu perfil',
  subtitle: 'Gira os seus dados de acesso, preferência de idioma e portabilidade básica de dados.',
  loading: 'A carregar perfil…',
  unavailableTitle: 'Perfil indisponível',
  unavailableBody: 'Entre novamente para gerir a sua conta.',
  personalTitle: 'Informações pessoais',
  personalBody: 'Estes dados vêm da sua conta ativa.',
  emailLabel: 'Email',
  nameLabel: 'Nome',
  namePlaceholder: 'O seu nome',
  save: 'Guardar',
  saving: 'A guardar…',
  invalidName: 'Introduza um nome válido.',
  nameSaved: 'Nome atualizado com sucesso.',
  nameSaveError: 'Não foi possível atualizar o nome agora.',
  languageTitle: 'Idioma de comunicação',
  languageBody: 'Escolha o idioma que a Risck Comply deve usar na apresentação de emails de conta e operacionais quando o remetente suporta preferências do destinatário.',
  languageLabel: 'Idioma preferido',
  languageSave: 'Guardar idioma',
  languageSaving: 'A guardar idioma…',
  languageSaved: 'Idioma de comunicação atualizado.',
  languageSaveError: 'Não foi possível atualizar o idioma de comunicação agora.',
  securityTitle: 'Segurança da conta',
  securityBody: 'Envie um email de recuperação de palavra-passe ou termine a sessão atual.',
  resetPassword: 'Enviar recuperação de palavra-passe',
  signOut: 'Terminar sessão',
  resetEmailMissing: 'Email indisponível para recuperação de palavra-passe.',
  resetEmailError: 'Não foi possível enviar o email de recuperação agora.',
  resetEmailSent: 'Email de recuperação enviado.',
  exportTitle: 'Exportar os meus dados',
  exportBody: 'Descarregue uma cópia dos dados básicos da sua conta em formato JSON.',
  exportAction: 'Exportar dados',
  exportSuccess: 'Dados exportados com sucesso.',
  dangerTitle: 'Zona de perigo',
  dangerBody: 'Para eliminar a conta, contacte o suporte. Esta ação exige confirmação segura.',
  supportAction: 'Contactar suporte',
};

const es: ProfileCopy = {
  accountEyebrow: 'Cuenta',
  title: 'Mi perfil',
  subtitle: 'Gestiona tus datos de acceso, preferencia de idioma y portabilidad básica de datos.',
  loading: 'Cargando perfil…',
  unavailableTitle: 'Perfil no disponible',
  unavailableBody: 'Vuelve a iniciar sesión para gestionar tu cuenta.',
  personalTitle: 'Información personal',
  personalBody: 'Estos datos proceden de tu cuenta activa.',
  emailLabel: 'Correo electrónico',
  nameLabel: 'Nombre',
  namePlaceholder: 'Tu nombre',
  save: 'Guardar',
  saving: 'Guardando…',
  invalidName: 'Introduce un nombre válido.',
  nameSaved: 'Nombre actualizado correctamente.',
  nameSaveError: 'No hemos podido actualizar tu nombre ahora.',
  languageTitle: 'Idioma de comunicación',
  languageBody: 'Elige el idioma que Risck Comply debe usar para presentar correos de cuenta y operativos cuando el remitente admita preferencias del destinatario.',
  languageLabel: 'Idioma preferido',
  languageSave: 'Guardar idioma',
  languageSaving: 'Guardando idioma…',
  languageSaved: 'Idioma de comunicación actualizado.',
  languageSaveError: 'No hemos podido actualizar el idioma de comunicación ahora.',
  securityTitle: 'Seguridad de la cuenta',
  securityBody: 'Envía un correo de recuperación de contraseña o cierra la sesión actual.',
  resetPassword: 'Enviar recuperación de contraseña',
  signOut: 'Cerrar sesión',
  resetEmailMissing: 'No hay correo disponible para recuperar la contraseña.',
  resetEmailError: 'No hemos podido enviar el correo de recuperación ahora.',
  resetEmailSent: 'Correo de recuperación enviado.',
  exportTitle: 'Exportar mis datos',
  exportBody: 'Descarga una copia de los datos básicos de tu cuenta en formato JSON.',
  exportAction: 'Exportar datos',
  exportSuccess: 'Datos exportados correctamente.',
  dangerTitle: 'Zona de peligro',
  dangerBody: 'Para eliminar la cuenta, contacta con soporte. Esta acción requiere confirmación segura.',
  supportAction: 'Contactar con soporte',
};

const fr: ProfileCopy = {
  accountEyebrow: 'Compte',
  title: 'Mon profil',
  subtitle: 'Gérez vos informations de connexion, votre langue préférée et la portabilité de base de vos données.',
  loading: 'Chargement du profil…',
  unavailableTitle: 'Profil indisponible',
  unavailableBody: 'Reconnectez-vous pour gérer votre compte.',
  personalTitle: 'Informations personnelles',
  personalBody: 'Ces informations proviennent de votre compte actif.',
  emailLabel: 'E-mail',
  nameLabel: 'Nom',
  namePlaceholder: 'Votre nom',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  invalidName: 'Saisissez un nom valide.',
  nameSaved: 'Nom mis à jour avec succès.',
  nameSaveError: 'Impossible de mettre à jour votre nom pour le moment.',
  languageTitle: 'Langue de communication',
  languageBody: 'Choisissez la langue que Risck Comply doit utiliser pour présenter les e-mails de compte et opérationnels lorsque l’expéditeur prend en charge les préférences du destinataire.',
  languageLabel: 'Langue préférée',
  languageSave: 'Enregistrer la langue',
  languageSaving: 'Enregistrement de la langue…',
  languageSaved: 'Langue de communication mise à jour.',
  languageSaveError: 'Impossible de mettre à jour la langue de communication pour le moment.',
  securityTitle: 'Sécurité du compte',
  securityBody: 'Envoyez un e-mail de récupération du mot de passe ou fermez la session en cours.',
  resetPassword: 'Envoyer la récupération du mot de passe',
  signOut: 'Se déconnecter',
  resetEmailMissing: 'E-mail indisponible pour la récupération du mot de passe.',
  resetEmailError: 'Impossible d’envoyer l’e-mail de récupération pour le moment.',
  resetEmailSent: 'E-mail de récupération envoyé.',
  exportTitle: 'Exporter mes données',
  exportBody: 'Téléchargez une copie des données de base de votre compte au format JSON.',
  exportAction: 'Exporter les données',
  exportSuccess: 'Données exportées avec succès.',
  dangerTitle: 'Zone sensible',
  dangerBody: 'Pour supprimer le compte, contactez le support. Cette action nécessite une confirmation sécurisée.',
  supportAction: 'Contacter le support',
};

const it: ProfileCopy = {
  accountEyebrow: 'Account',
  title: 'Il mio profilo',
  subtitle: 'Gestisci i dati di accesso, la lingua preferita e la portabilità di base dei dati.',
  loading: 'Caricamento profilo…',
  unavailableTitle: 'Profilo non disponibile',
  unavailableBody: 'Accedi di nuovo per gestire il tuo account.',
  personalTitle: 'Informazioni personali',
  personalBody: 'Questi dati provengono dal tuo account attivo.',
  emailLabel: 'Email',
  nameLabel: 'Nome',
  namePlaceholder: 'Il tuo nome',
  save: 'Salva',
  saving: 'Salvataggio…',
  invalidName: 'Inserisci un nome valido.',
  nameSaved: 'Nome aggiornato correttamente.',
  nameSaveError: 'Non è stato possibile aggiornare il nome.',
  languageTitle: 'Lingua di comunicazione',
  languageBody: 'Scegli la lingua che Risck Comply deve usare per presentare le email dell’account e operative quando il mittente supporta le preferenze del destinatario.',
  languageLabel: 'Lingua preferita',
  languageSave: 'Salva lingua',
  languageSaving: 'Salvataggio lingua…',
  languageSaved: 'Lingua di comunicazione aggiornata.',
  languageSaveError: 'Non è stato possibile aggiornare la lingua di comunicazione.',
  securityTitle: 'Sicurezza dell’account',
  securityBody: 'Invia un’email di recupero password o termina la sessione corrente.',
  resetPassword: 'Invia recupero password',
  signOut: 'Esci',
  resetEmailMissing: 'Email non disponibile per il recupero password.',
  resetEmailError: 'Non è stato possibile inviare l’email di recupero.',
  resetEmailSent: 'Email di recupero inviata.',
  exportTitle: 'Esporta i miei dati',
  exportBody: 'Scarica una copia dei dati di base del tuo account in formato JSON.',
  exportAction: 'Esporta dati',
  exportSuccess: 'Dati esportati correttamente.',
  dangerTitle: 'Zona pericolosa',
  dangerBody: 'Per eliminare l’account, contatta il supporto. Questa azione richiede una conferma sicura.',
  supportAction: 'Contatta il supporto',
};

const de: ProfileCopy = {
  accountEyebrow: 'Konto',
  title: 'Mein Profil',
  subtitle: 'Verwalte Anmeldedaten, bevorzugte Sprache und die grundlegende Datenportabilität.',
  loading: 'Profil wird geladen…',
  unavailableTitle: 'Profil nicht verfügbar',
  unavailableBody: 'Melde dich erneut an, um dein Konto zu verwalten.',
  personalTitle: 'Persönliche Informationen',
  personalBody: 'Diese Daten stammen aus deinem aktiven Konto.',
  emailLabel: 'E-Mail',
  nameLabel: 'Name',
  namePlaceholder: 'Dein Name',
  save: 'Speichern',
  saving: 'Wird gespeichert…',
  invalidName: 'Gib einen gültigen Namen ein.',
  nameSaved: 'Name erfolgreich aktualisiert.',
  nameSaveError: 'Der Name konnte gerade nicht aktualisiert werden.',
  languageTitle: 'Kommunikationssprache',
  languageBody: 'Wähle die Sprache, die Risck Comply für Konto- und Betriebs-E-Mails verwenden soll, wenn der Absender Empfängerpräferenzen unterstützt.',
  languageLabel: 'Bevorzugte Sprache',
  languageSave: 'Sprache speichern',
  languageSaving: 'Sprache wird gespeichert…',
  languageSaved: 'Kommunikationssprache aktualisiert.',
  languageSaveError: 'Die Kommunikationssprache konnte gerade nicht aktualisiert werden.',
  securityTitle: 'Kontosicherheit',
  securityBody: 'Sende eine E-Mail zur Passwortwiederherstellung oder beende die aktuelle Sitzung.',
  resetPassword: 'Passwortwiederherstellung senden',
  signOut: 'Abmelden',
  resetEmailMissing: 'Für die Passwortwiederherstellung ist keine E-Mail verfügbar.',
  resetEmailError: 'Die Wiederherstellungs-E-Mail konnte gerade nicht gesendet werden.',
  resetEmailSent: 'Wiederherstellungs-E-Mail gesendet.',
  exportTitle: 'Meine Daten exportieren',
  exportBody: 'Lade eine Kopie deiner grundlegenden Kontodaten im JSON-Format herunter.',
  exportAction: 'Daten exportieren',
  exportSuccess: 'Daten erfolgreich exportiert.',
  dangerTitle: 'Gefahrenbereich',
  dangerBody: 'Kontaktiere den Support, um das Konto zu löschen. Diese Aktion erfordert eine sichere Bestätigung.',
  supportAction: 'Support kontaktieren',
};

export const profileCopyByLocale: Record<Locale, ProfileCopy> = { en, pt, es, fr, it, de };
