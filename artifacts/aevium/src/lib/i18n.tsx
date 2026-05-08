import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'es';

const translations = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    'landing.title': 'The writer\'s cockpit',
    'landing.subtitle': 'Serious tools for serious fiction writers. Organize, write, and refine.',
    'landing.cta': 'Start Writing',
    'dashboard.title': 'Your Projects',
    'dashboard.create': 'New Project',
    'dashboard.recent': 'Recent Activity',
    'dashboard.empty': 'No projects yet. Start your next great story.',
    'dashboard.stats.words': 'Total Words',
    'dashboard.stats.books': 'Books',
    'dashboard.stats.chapters': 'Chapters',
    'project.settings': 'Project Settings',
    'project.name': 'Project Name',
    'project.description': 'Description',
    'project.type': 'Type',
    'project.language': 'Language',
    'project.status': 'Status',
    'editor.books': 'Books',
    'editor.chapters': 'Chapters',
    'editor.scenes': 'Scenes',
    'editor.ai': 'AI Assistant',
    'editor.memory': 'Memory',
    'editor.continuity': 'Continuity',
    'editor.words': 'words',
    'form.save': 'Save',
    'form.cancel': 'Cancel',
    'form.delete': 'Delete',
    'settings.title': 'Settings',
    'settings.theme': 'Theme',
    'settings.theme.dark': 'Dark Mode',
    'settings.theme.light': 'Light Mode',
    'settings.theme.system': 'System',
    'settings.language': 'Language',
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.projects': 'Proyectos',
    'nav.settings': 'Ajustes',
    'nav.signOut': 'Cerrar Sesión',
    'landing.title': 'La cabina del escritor',
    'landing.subtitle': 'Herramientas serias para escritores de ficción serios. Organiza, escribe y refina.',
    'landing.cta': 'Empezar a Escribir',
    'dashboard.title': 'Tus Proyectos',
    'dashboard.create': 'Nuevo Proyecto',
    'dashboard.recent': 'Actividad Reciente',
    'dashboard.empty': 'Aún no hay proyectos. Empieza tu próxima gran historia.',
    'dashboard.stats.words': 'Palabras Totales',
    'dashboard.stats.books': 'Libros',
    'dashboard.stats.chapters': 'Capítulos',
    'project.settings': 'Ajustes del Proyecto',
    'project.name': 'Nombre del Proyecto',
    'project.description': 'Descripción',
    'project.type': 'Tipo',
    'project.language': 'Idioma',
    'project.status': 'Estado',
    'editor.books': 'Libros',
    'editor.chapters': 'Capítulos',
    'editor.scenes': 'Escenas',
    'editor.ai': 'Asistente IA',
    'editor.memory': 'Memoria',
    'editor.continuity': 'Continuidad',
    'editor.words': 'palabras',
    'form.save': 'Guardar',
    'form.cancel': 'Cancelar',
    'form.delete': 'Eliminar',
    'settings.title': 'Ajustes',
    'settings.theme': 'Tema',
    'settings.theme.dark': 'Modo Oscuro',
    'settings.theme.light': 'Modo Claro',
    'settings.theme.system': 'Sistema',
    'settings.language': 'Idioma',
  }
};

type I18nContextType = {
  t: (key: keyof typeof translations.en) => string;
  lang: Language;
  setLang: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('aevium-lang');
    return (saved === 'es' || saved === 'en') ? saved : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('aevium-lang', newLang);
  };

  const t = (key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
