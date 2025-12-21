// src/Components/TrendingSection/TrendingSection.tsx
import { useEffect, useState } from 'react';
import styles from './TrendingSection.module.css';
import { MovieCard, type Movie } from '../MovieCard/MovieCard';
import { VideoPlayer } from '../VideoPlayer/VideoPlayer';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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

  // Clear selected movie when changing tabs, search, or genre
  useEffect(() => {
    setSelected(null);
    setIsPlayerOpen(false);
  }, [activeTab, searchQuery, selectedGenre]);

  useEffect(() => {
    async function fetchMovies() {
      setLoading(true);
      try {
        let url = '';
        
        if (searchQuery.trim()) {
          url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&page=1`;
          if (selectedGenre) {
            url += `&with_genres=${selectedGenre}`;
          }
        } else {
          switch (activeTab) {
            case 'home':
              url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}`;
              break;
            case 'new':
              url = `${TMDB_BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=1`;
              break;
            case 'popular':
              url = `${TMDB_BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`;
              break;
          }
          
          if (selectedGenre) {
            url = `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${selectedGenre}&sort_by=`;
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
      } catch (error) {
        console.error('Failed to fetch movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, [activeTab, searchQuery, selectedGenre]);

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
