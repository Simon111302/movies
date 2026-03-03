import { useEffect, useRef, useState } from 'react';
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
  const activeGenreName =
    GENRES.find((genre) => genre.id === selectedGenre)?.name ?? 'All Genres';

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
      <div className={styles.topRow}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>MS</div>
          <div className={styles.brandText}>
            <p className={styles.brandTitle}>MovieS</p>
            <p className={styles.brandTagline}>Discover movies in seconds</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Movie sections">
          <button
            className={`${styles.navLink} ${activeTab === 'home' ? styles.active : ''}`}
            onClick={() => onTabChange('home')}
          >
            Discover
          </button>
          <button
            className={`${styles.navLink} ${activeTab === 'new' ? styles.active : ''}`}
            onClick={() => onTabChange('new')}
          >
            Upcoming
          </button>
          <button
            className={`${styles.navLink} ${activeTab === 'popular' ? styles.active : ''}`}
            onClick={() => onTabChange('popular')}
          >
            Popular
          </button>
        </nav>
      </div>

      <div className={styles.actionsRow}>
        <div className={styles.filterWrapper} ref={filterRef}>
          <button
            className={styles.filterButton}
            onClick={() => setShowGenreFilter(!showGenreFilter)}
            aria-label="Filter by genre"
            aria-expanded={showGenreFilter}
          >
            <span className={styles.filterLabel}>Genre</span>
            <span className={styles.filterValue}>{activeGenreName}</span>
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
          <span className={styles.searchIcon} aria-hidden="true">
            Search
          </span>
          <input
            className={styles.searchInput}
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search movies"
          />
          {searchQuery && (
            <button
              className={styles.clearSearch}
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
