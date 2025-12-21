// src/App.tsx
import { useState } from 'react';
import './App.css';
import { Header } from './Components/Header/Header';
import { TrendingSection } from './Components/TrendingSection/TrendingSection';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'new' | 'popular'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
      />
      <main className="main">
        <div className="main-inner">
          <TrendingSection
            activeTab={activeTab}
            searchQuery={searchQuery}
            selectedGenre={selectedGenre}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
