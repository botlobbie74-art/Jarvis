const translations = {
  en: {
    dashboard_chat: "Chat",
    dashboard_plugins: "Plugins",
    dashboard_build: "Build",
    dashboard_habits: "Habits",
    dashboard_billing: "Billing",
    dashboard_settings: "Settings",
    dashboard_credits: "Credits",
    dashboard_refill: "Refill Credits",
    dashboard_out_of_credits: "You're out of credits! Don't let the credits break your imagination.",
    dashboard_recent_chats: "Recent chats",
    dashboard_forging: "Anything you want.",
    dashboard_rename: "Rename Project",
    dashboard_desc: "Add Description",
    dashboard_confirm: "Confirm",
    dashboard_cancel: "Cancel",
    billing_title: "Billing & usage",
    billing_desc: "Manage your subscription and check your monthly usage.",
    billing_current_plan: "Current plan",
    billing_balance: "Credit Balance",
    billing_topup: "Top up Credits",
    billing_monthly: "Monthly Plans",
    settings_title: "Custom instructions",
    settings_desc: "Tailor each assistant's brain.",
    plugins_title: "Modules",
    plugins_desc: "Connect your digital life.",
    habits_title: "Habits",
    habits_desc: "Automate your daily routines.",
    build_hero: "Anything you want.",
    build_placeholder: "Describe the app or feature you want to build...",
    build_start: "Build App",
    build_recent: "Recent projects",
  },
  fr: {
    dashboard_chat: "Chat",
    dashboard_plugins: "Plugins",
    dashboard_build: "Build",
    dashboard_habits: "Habitudes",
    dashboard_billing: "Facturation",
    dashboard_settings: "Paramètres",
    dashboard_credits: "Crédits",
    dashboard_refill: "Recharger des crédits",
    dashboard_out_of_credits: "Vous n'avez plus de crédits ! Ne laissez pas les crédits briser votre imagination.",
    dashboard_recent_chats: "Chats récents",
    dashboard_forging: "Tout ce que vous voulez.",
    dashboard_rename: "Renommer le projet",
    dashboard_desc: "Ajouter une description",
    dashboard_confirm: "Confirmer",
    dashboard_cancel: "Annuler",
    billing_title: "Facturation & usage",
    billing_desc: "Gérez votre abonnement et vérifiez votre consommation mensuelle.",
    billing_current_plan: "Forfait actuel",
    billing_balance: "Solde de crédits",
    billing_topup: "Recharger des crédits",
    billing_monthly: "Forfaits mensuels",
    settings_title: "Instructions personnalisées",
    settings_desc: "Personnalisez le cerveau de chaque assistant.",
    plugins_title: "Modules",
    plugins_desc: "Connectez votre vie numérique.",
    habits_title: "Habitudes",
    habits_desc: "Automatisez vos routines quotidiennes.",
    build_hero: "Tout ce que vous voulez.",
    build_placeholder: "Décrivez l'application ou la fonctionnalité que vous souhaitez créer...",
    build_start: "Créer l'application",
    build_recent: "Projets récents",
  }
};

const getLang = () => {
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith('fr') ? 'fr' : 'en';
};

export const t = (key) => {
  const lang = getLang();
  return translations[lang][key] || translations['en'][key] || key;
};
