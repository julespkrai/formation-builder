import type { Formation, ModuleWithCourses, Resource, KnowledgeBase } from './types'

export const DEMO_USER_ID = 'demo-user-id'
export const DEMO_USER_EMAIL = 'julien@woosby.com'

export const DEMO_FORMATIONS: Formation[] = [
  {
    id: 'demo-formation-1',
    user_id: DEMO_USER_ID,
    title: 'Ouvrir une crèche : le guide complet',
    description: 'Tout ce que vous devez savoir pour créer et gérer une crèche en France en 2025.',
    status: 'in_progress',
    objectives: 'À la fin de cette formation, vous saurez monter un dossier PSU, recruter une équipe conforme CCN ALISFA, et ouvrir votre crèche en toute sérénité.',
    target_audience: 'Porteurs de projet de création de crèche, professionnels de la petite enfance',
    created_at: '2025-11-01T08:00:00Z',
    updated_at: '2026-01-15T14:30:00Z',
  },
  {
    id: 'demo-formation-2',
    user_id: DEMO_USER_ID,
    title: 'Marketing digital pour pros de la petite enfance',
    description: 'Attirer des familles, créer du contenu et remplir votre crèche grâce aux réseaux sociaux.',
    status: 'draft',
    objectives: 'Créer une présence en ligne efficace, générer des inscriptions via Instagram et Facebook, et fidéliser votre communauté de parents.',
    target_audience: 'Directeurs et porteurs de projet de micro-crèche',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-18T09:00:00Z',
  },
]

export const DEMO_MODULES: Record<string, ModuleWithCourses[]> = {
  'demo-formation-1': [
    {
      id: 'demo-mod-1',
      formation_id: 'demo-formation-1',
      title: 'Les bases légales et réglementaires',
      description: 'PSU, PMI, CCN ALISFA — les fondations juridiques de votre projet',
      order: 0,
      created_at: '2025-11-01T08:00:00Z',
      courses: [
        {
          id: 'demo-course-1',
          module_id: 'demo-mod-1',
          title: 'Comprendre le PSU et la CAF',
          intro: 'Le contrat PSU est le cœur du modèle économique d\'une crèche. Voici comment le décrypter.',
          teleprompter_text: `Bonjour et bienvenue dans ce premier cours de notre formation sur la création d'une crèche.\n\nAujourd'hui, on va parler de quelque chose qui fait peur à beaucoup de porteurs de projet : le PSU, ou Prestation de Service Unique.\n\nLe PSU, c'est le contrat que vous allez signer avec la CAF, la Caisse d'Allocations Familiales. C'est lui qui définit le montant que la CAF vous verse chaque mois pour chaque heure d'accueil facturée à une famille.\n\nEn 2025, le PSU représente entre 55 et 66 % de vos recettes. Autrement dit, sans PSU, votre crèche n'est pas viable.\n\nPour bénéficier du PSU, vous devez respecter plusieurs conditions. D'abord, votre agrément doit être accordé par la PMI, la Protection Maternelle et Infantile. Ensuite, vous devez appliquer le barème national des participations familiales. Et enfin, vous devez respecter les taux d'encadrement définis par le décret de 2021.\n\nDans les prochains cours, on va voir étape par étape comment préparer votre dossier et obtenir cet agrément.`,
          estimated_seconds: 78,
          order: 0,
          created_at: '2025-11-01T08:00:00Z',
          updated_at: '2025-11-01T08:00:00Z',
        },
        {
          id: 'demo-course-2',
          module_id: 'demo-mod-1',
          title: 'Le taux d\'encadrement en pratique',
          intro: 'Comment calculer le bon nombre de professionnels selon votre capacité d\'accueil.',
          teleprompter_text: `Le taux d'encadrement, c'est la règle qui dit combien de professionnels vous devez avoir en salle par rapport au nombre d'enfants accueillis.\n\nDepuis le décret de 2021, le calcul est simplifié. Pour un accueil en âge mélangé — c'est-à-dire avec des bébés et des enfants qui marchent dans le même espace — vous avez besoin d'un professionnel pour six enfants.\n\nPrenons un exemple concret. Votre crèche a une capacité de 24 berceaux. À pleine occupation, vous devez avoir au minimum quatre professionnels en salle.\n\nAttention : parmi ces professionnels, au moins la moitié doit être qualifiée. C'est-à-dire titulaire d'un diplôme d'auxiliaire de puériculture, d'éducateur de jeunes enfants, ou équivalent.\n\nLa bonne nouvelle, c'est que si vous avez une CAP petite enfance ou un CAP cuisine, vous pouvez être compté dans le taux — à condition que la moitié de l'équipe en salle soit qualifiée.\n\nOn reviendra sur ces règles dans le module dédié aux ressources humaines.`,
          estimated_seconds: 72,
          order: 1,
          created_at: '2025-11-01T08:30:00Z',
          updated_at: '2025-11-01T08:30:00Z',
        },
      ],
    },
    {
      id: 'demo-mod-2',
      formation_id: 'demo-formation-1',
      title: 'Construire son équipe',
      description: 'Recrutement, CCN ALISFA, fiches de poste',
      order: 1,
      created_at: '2025-11-02T08:00:00Z',
      courses: [
        {
          id: 'demo-course-3',
          module_id: 'demo-mod-2',
          title: 'La CCN ALISFA expliquée simplement',
          intro: 'La convention collective qui s\'applique à votre crèche et ce qu\'elle implique concrètement.',
          teleprompter_text: ``,
          estimated_seconds: 0,
          order: 0,
          created_at: '2025-11-02T08:00:00Z',
          updated_at: '2025-11-02T08:00:00Z',
        },
      ],
    },
  ],
  'demo-formation-2': [
    {
      id: 'demo-mod-3',
      formation_id: 'demo-formation-2',
      title: 'Créer votre présence en ligne',
      description: null,
      order: 0,
      created_at: '2026-01-10T10:00:00Z',
      courses: [
        {
          id: 'demo-course-4',
          module_id: 'demo-mod-3',
          title: 'Pourquoi Instagram est incontournable pour une crèche',
          intro: null,
          teleprompter_text: ``,
          estimated_seconds: 0,
          order: 0,
          created_at: '2026-01-10T10:00:00Z',
          updated_at: '2026-01-10T10:00:00Z',
        },
      ],
    },
  ],
}

export const DEMO_RESOURCES: Record<string, Resource[]> = {
  'demo-formation-1': [
    {
      id: 'demo-res-1',
      formation_id: 'demo-formation-1',
      course_id: null,
      title: 'Décret n°2021-1131 — taux d\'encadrement',
      type: 'link',
      content: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043940665',
      file_path: null,
      created_at: '2025-11-01T08:00:00Z',
    },
    {
      id: 'demo-res-2',
      formation_id: 'demo-formation-1',
      course_id: null,
      title: 'Grille de salaires CCN ALISFA 2026',
      type: 'text',
      content: 'Valeur du point : 55€ | EJE débutant : 2 173€/mois | Auxiliaire débutant : 1 917€/mois | CAP PE débutant : ~1 917€/mois',
      file_path: null,
      created_at: '2025-11-01T09:00:00Z',
    },
  ],
  'demo-formation-2': [],
}

export const DEMO_KNOWLEDGE_BASE: Record<string, KnowledgeBase[]> = {
  'demo-formation-1': [
    {
      id: 'demo-kb-1',
      formation_id: 'demo-formation-1',
      title: 'Notes CCN ALISFA — droits et obligations',
      type: 'text',
      raw_content: 'Convention Collective Nationale ALISFA (avril 2026). Valeur du point : 55€. SSC 2026 : 1916,67€/mois. EJE débutant : 2173€/mois. 33 jours congés ouvrés. LODEOM applicable à La Réunion : exonérations de charges pour les employeurs en zone DOM.',
      file_path: null,
      created_at: '2025-11-01T10:00:00Z',
    },
  ],
  'demo-formation-2': [],
}
