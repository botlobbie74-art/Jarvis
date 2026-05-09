export const PLANS = [
  {
    id: "free",
    name: "FREE",
    price: "0",
    period: "gratuit pour toujours",
    credits: 50,
    credits_label: "crédits par jour",
    popular: false,
    features: [
      "50 crédits offerts par jour",
      "Chat IA (limité à 10 msgs/jour)",
      "1 projet Builder actif maximum",
      "Plugins Google uniquement",
      "Pas de Telegram ni tâches planifiées"
    ],
    buttonText: "Commencer gratuitement",
    buttonAction: "signup"
  },
  {
    id: "starter",
    name: "STARTER",
    price: "9.99",
    period: "/mois",
    credits: 1000,
    credits_label: "crédits mensuels",
    popular: false,
    features: [
      "1 000 crédits mensuels",
      "Chat IA illimité",
      "App Builder (5 déploiements GitHub/mois)",
      "Plugins Google + GitHub",
      "Intégration Telegram",
      "Support par email"
    ],
    buttonText: "Sélectionner",
    buttonAction: "checkout_starter"
  },
  {
    id: "pro",
    name: "PRO",
    price: "24.99",
    period: "/mois",
    credits: 2500,
    credits_label: "crédits mensuels",
    popular: true,
    popularLabel: "LE PLUS POPULAIRE",
    features: [
      "2 500 crédits mensuels",
      "Chat IA illimité",
      "App Builder (déploiements illimités)",
      "Tous les plugins connectés",
      "Chief of Staff Engine (missions multi-tâches)",
      "Tâches planifiées en arrière-plan",
      "Terminal agent intégré",
      "Support prioritaire par email"
    ],
    buttonText: "Sélectionner",
    buttonAction: "checkout_pro"
  },
  {
    id: "ultra",
    name: "ULTRA",
    price: "49.99",
    period: "/mois",
    credits: 5000,
    credits_label: "crédits mensuels",
    popular: false,
    features: [
      "5 000 crédits mensuels",
      "Tout le plan Pro inclus",
      "Deep Research Mode (Tavily avancé)",
      "User DNA Engine (apprentissage habitudes)",
      "Accès anticipé aux nouvelles features",
      "Support VIP par chat direct"
    ],
    buttonText: "Sélectionner",
    buttonAction: "checkout_ultra"
  }
];
