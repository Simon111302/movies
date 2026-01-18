// src/Components/TrendingSection/TrendingSection.tsx
import { useEffect, useState } from 'react';
import styles from './TrendingSection.module.css';
import { MovieCard, type Movie } from '../MovieCard/MovieCard';
import { VideoPlayer } from '../VideoPlayer/VideoPlayer';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string;
const TMDB_BASE_URL = import.meta.env.VITE_TMDB_BASE_URL as string;
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL as string;

type TrendingSectionProps = {
  activeTab: 'home' | 'new' | 'popular';
  searchQuery: string;
  selectedGenre: number | null;
};

export function TrendingSection({
  activeTab,
  searchQuery,
  selectedGenre,
}: TrendingSectionProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Clear selected movie and reset page when changing tabs, search, or genre
  useEffect(() => {
    setSelected(null);
    setIsPlayerOpen(false);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [activeTab, searchQuery, selectedGenre]);

  useEffect(() => {
    async function fetchMovies() {
      setLoading(true);
      try {
        let url = '';
        
        if (searchQuery.trim()) {
          url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
          if (selectedGenre) {
            url += `&with_genres=${selectedGenre}`;
          }
        } else {
          switch (activeTab) {
            case 'home':
              // Trending doesn't support pagination, but we'll add page parameter anyway
              url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${currentPage}`;
              break;
            case 'new':
              url = `${TMDB_BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=${currentPage}`;
              break;
            case 'popular':
              url = `${TMDB_BASE_URL}/movie/popular?api_key=${API_KEY}&page=${currentPage}`;
              break;
          }
          
          if (selectedGenre) {
            url = `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${selectedGenre}&page=${currentPage}&sort_by=`;
            if (activeTab === 'new') {
              url += 'release_date.desc';
            } else if (activeTab === 'popular') {
              url += 'popularity.desc';
            } else {
              url += 'popularity.desc';
            }
          }
        }

        const res = await fetch(url);
        const data = await res.json();

        const mapped: Movie[] = (data.results || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          poster: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : '',
          overview: m.overview,
          releaseDate: m.release_date,
          voteAverage: m.vote_average,
        }));

        setMovies(mapped);
        // Set total pages (cap at 10 as requested)
        const total = Math.min(data.total_pages || 1, 10);
        setTotalPages(total);
      } catch (error) {
        console.error('Failed to fetch movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, [activeTab, searchQuery, selectedGenre, currentPage]);

  function handleMovieClick(movie: Movie) {
    setSelected(movie);
    setIsPlayerOpen(true); // Open video player immediately
  }

  const getGenreName = (genreId: number | null) => {
    const genres: Record<number, string> = {
      27: 'Horror',
      28: 'Action',
      35: 'Comedy',
      18: 'Drama',
      14: 'Fantasy',
      878: 'Science Fiction',
      53: 'Thriller',
      16: 'Animation',
      80: 'Crime',
      10749: 'Romance',
      99: 'Documentary',
    };
    return genreId ? genres[genreId] || 'Filtered' : null;
  };

  const getSectionTitle = () => {
    if (searchQuery.trim()) {
      return `Search Results: "${searchQuery}"`;
    }
    switch (activeTab) {
      case 'home':
        return 'Trending This Week';
      case 'new':
        return 'New Releases';
      case 'popular':
        return 'Popular Movies';
      default:
        return 'Movies';
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{getSectionTitle()}</h2>
        {selectedGenre && (
          <span className={styles.genreBadge}>
            {getGenreName(selectedGenre)}
          </span>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>Loading movies...</div>
      )}

      {!loading && movies.length === 0 && (
        <div className={styles.noResults}>
          {searchQuery.trim() 
            ? `No movies found for "${searchQuery}"`
            : 'No movies found'}
        </div>
      )}

      <div className={styles.movieGrid}>
        {movies.map((m) => (
          <MovieCard
            key={m.id}
            movie={m}
            onClick={() => handleMovieClick(m)}
          />
        ))}
      </div>

      {/* Pagination */}
      {!loading && movies.length > 0 && totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`${styles.pageButton} ${
                currentPage === page ? styles.active : ''
              }`}
              onClick={() => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label={`Go to page ${page}`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <VideoPlayer
          movieId={selected.id}
          movieTitle={selected.title}
          moviePoster={selected.poster}
          movieOverview={selected.overview || ''}
          isOpen={isPlayerOpen}
          onClose={() => {
            setIsPlayerOpen(false);
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}
