import styles from './MovieCard.module.css';

export type Movie = {
  id: number;
  title: string;
  poster: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
};    

type Props = {
  movie: Movie;
  onClick: () => void;
};

export function MovieCard({ movie, onClick }: Props) {
  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const rating = typeof movie.voteAverage === 'number' ? movie.voteAverage.toFixed(1) : 'N/A';

  return (
    <article className={styles.movieCard}>
      <button
        className={styles.cardButton}
        onClick={onClick}
        aria-label={`Open ${movie.title}`}
      >
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className={styles.moviePoster} />
        ) : (
          <div className={styles.posterFallback} aria-hidden="true">
            No Poster
          </div>
        )}
        <div className={styles.overlay}>
          <div className={styles.topMeta}>
            <span className={styles.rating}>Rating {rating}</span>
            {releaseYear && <span className={styles.year}>{releaseYear}</span>}
          </div>
          <span className={styles.playLabel}>Watch Now</span>
        </div>
        <div className={styles.info}>
          <h3 className={styles.movieTitle}>{movie.title}</h3>
        </div>
      </button>
    </article>
  );
}
