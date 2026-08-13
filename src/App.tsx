import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CardsProvider } from './hooks/useCards'
import { CardList } from './screens/CardList'
import { CardView } from './screens/CardView'
import { CardEdit } from './screens/CardEdit'
import { Settings } from './screens/Settings'

/**
 * Routage par hash : aucune réécriture d'URL à configurer côté serveur,
 * l'app fonctionne telle quelle sur n'importe quel hébergement statique
 * et depuis le cache du service worker.
 */
export function App() {
  return (
    <CardsProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<CardList />} />
          <Route path="/add" element={<CardEdit />} />
          <Route path="/card/:id" element={<CardView />} />
          <Route path="/card/:id/edit" element={<CardEdit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </CardsProvider>
  )
}
