/* engine/news.js — Notícias (placeholder) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  const News = {
    makeWelcome(career) {
      const club = career?.club?.name || 'seu clube';
      const role = career?.role?.name || 'Manager';
      const name = `${career?.manager?.firstName || ''} ${career?.manager?.lastName || ''}`.trim();
      return {
        title: 'Bem-vindo ao clube!',
        body: `${name} assume como ${role} no ${club}. A temporada começa agora — decisões importam.`,
        createdAt: new Date().toISOString()
      };
    }
  };
  NS.Engine = NS.Engine || {};
  NS.Engine.News = News;
})();