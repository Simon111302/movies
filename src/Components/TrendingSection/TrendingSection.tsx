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

type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  overview?: string;
  release_date?: string;
  vote_average?: number;
};

type TmdbResponse = {
  results?: TmdbMovie[];
  total_pages?: number;
};

function getPaginationItems(totalPages: number, currentPage: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | string> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('left-ellipsis');
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) pages.push('right-ellipsis');

  pages.push(totalPages);
  return pages;
}

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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setSelected(null);
    setIsPlayerOpen(false);
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedGenre]);

  useEffect(() => {
    async function fetchMovies() {
      if (!API_KEY || !TMDB_BASE_URL || !IMAGE_BASE_URL) {
        setErrorMessage('Missing API configuration in environment variables.');
        setMovies([]);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        let url = '';

        if (searchQuery.trim()) {
          const params = new URLSearchParams({
            api_key: API_KEY,
            query: searchQuery.trim(),
            page: String(currentPage),
          });

          if (selectedGenre) {
            params.append('with_genres', String(selectedGenre));
          }

          url = `${TMDB_BASE_URL}/search/movie?${params.toString()}`;
        } else if (selectedGenre) {
          const params = new URLSearchParams({
            api_key: API_KEY,
            with_genres: String(selectedGenre),
            page: String(currentPage),
            sort_by: activeTab === 'new' ? 'release_date.desc' : 'popularity.desc',
          });

          url = `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
        } else {
          const params = new URLSearchParams({
            api_key: API_KEY,
            page: String(currentPage),
          });

          if (activeTab === 'home') {
            url = `${TMDB_BASE_URL}/trending/movie/week?${params.toString()}`;
          } else if (activeTab === 'new') {
            url = `${TMDB_BASE_URL}/movie/upcoming?${params.toString()}`;
          } else {
            url = `${TMDB_BASE_URL}/movie/popular?${params.toString()}`;
          }
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`TMDB request failed (${response.status})`);
        }

        const data: TmdbResponse = await response.json();
        const mappedMovies: Movie[] = (data.results ?? []).map((movie) => ({
          id: movie.id,
          title: movie.title,
          poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '',
          overview: movie.overview,
          releaseDate: movie.release_date,
          voteAverage: movie.vote_average,
        }));

        setMovies(mappedMovies);
        setTotalPages(Math.min(data.total_pages ?? 1, 10));
      } catch (error) {
        console.error('Failed to fetch movies:', error);
        setErrorMessage('Unable to load movies right now. Please try again.');
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, [activeTab, searchQuery, selectedGenre, currentPage]);

  function handleMovieClick(movie: Movie) {
    setSelected(movie);
    setIsPlayerOpen(true);
  }

  function getGenreName(genreId: number | null) {
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
  }

  function getSectionTitle() {
    if (searchQuery.trim()) return `Search: "${searchQuery}"`;
    if (activeTab === 'home') return 'Trending This Week';
    if (activeTab === 'new') return 'Upcoming Releases';
    return 'Most Popular Now';
  }

  function getSectionSubtitle() {
    if (searchQuery.trim()) {
      return 'Results matched to your search and active filters.';
    }

    if (activeTab === 'home') {
      return 'Fresh picks that are currently taking over watchlists.';
    }

    if (activeTab === 'new') {
      return 'Movies scheduled to release soon, updated by TMDB.';
    }

    return 'Audience favorites ranked by overall popularity.';
  }

  const genreName = getGenreName(selectedGenre);
  const paginationItems = getPaginationItems(totalPages, currentPage);
  const hasNoResults = !loading && movies.length === 0;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>{getSectionTitle()}</h2>
          <p className={styles.subtitle}>{getSectionSubtitle()}</p>
        </div>

        <div className={styles.badges}>
          {genreName && <span className={styles.genreBadge}>{genreName}</span>}
          <span className={styles.countBadge}>
            {loading ? 'Loading...' : `${movies.length} title${movies.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {errorMessage && <div className={styles.errorBox}>{errorMessage}</div>}

      {loading && (
        <div className={styles.movieGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {hasNoResults && (
        <div className={styles.emptyState}>
          <h3>No movies found</h3>
          <p>Try another keyword, or switch tabs to discover more options.</p>
        </div>
      )}

      {!loading && movies.length > 0 && (
        <div className={styles.movieGrid}>
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onClick={() => handleMovieClick(movie)}
            />
          ))}
        </div>
      )}

      {!loading && movies.length > 0 && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageControl}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            Prev
          </button>

          {paginationItems.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                className={`${styles.pageButton} ${
                  currentPage === item ? styles.active : ''
                }`}
                onClick={() => {
                  setCurrentPage(item);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label={`Go to page ${item}`}
              >
                {item}
              </button>
            ) : (
              <span key={item} className={styles.ellipsis}>
                ...
              </span>
            ),
          )}

          <button
            className={styles.pageControl}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next
          </button>
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
