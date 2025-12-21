// src/components/Header/Header.tsx
import { useState, useEffect, useRef } from 'react';
import styles from './Header.module.css';

type HeaderProps = {
  activeTab: 'home' | 'new' | 'popular';
  onTabChange: (tab: 'home' | 'new' | 'popular') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGenre: number | null;
  onGenreChange: (genreId: number | null) => void;
};

const GENRES = [
  { id: null, name: 'All Genres' },
  { id: 27, name: 'Horror' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
  { id: 16, name: 'Animation' },
  { id: 80, name: 'Crime' },
  { id: 10749, name: 'Romance' },
  { id: 99, name: 'Documentary' },
];

export function Header({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
}: HeaderProps) {
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowGenreFilter(false);
      }
    }

    if (showGenreFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGenreFilter]);

  return (
    <header className={styles.header}>
      <div className={styles.logo}>KapoyaBuhatAni</div>

      <nav className={styles.nav}>
        <button
          className={`${styles.navLink} ${activeTab === 'home' ? styles.active : ''}`}
          onClick={() => onTabChange('home')}
        >
          Home
        </button>
        <button
          className={`${styles.navLink} ${activeTab === 'new' ? styles.active : ''}`}
          onClick={() => onTabChange('new')}
        >
          New
        </button>
        <button
          className={`${styles.navLink} ${activeTab === 'popular' ? styles.active : ''}`}
          onClick={() => onTabChange('popular')}
        >
          Popular
        </button>
      </nav>

      <div className={styles.headerRight}>
        <div className={styles.filterWrapper} ref={filterRef}>
          <button
            className={styles.filterButton}
            onClick={() => setShowGenreFilter(!showGenreFilter)}
          >
            Filter {selectedGenre !== null && '✓'}
          </button>
          {showGenreFilter && (
            <div className={styles.genreDropdown}>
              {GENRES.map((genre) => (
                <button
                  key={genre.id ?? 'all'}
                  className={`${styles.genreOption} ${
                    selectedGenre === genre.id ? styles.active : ''
                  }`}
                  onClick={() => {
                    onGenreChange(genre.id);
                    setShowGenreFilter(false);
                  }}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.searchWrapper}>
          <input
            className={styles.searchInput}
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onSearchChange(searchQuery);
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
