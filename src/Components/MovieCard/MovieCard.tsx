// src/Components/MovieCard/MovieCard.tsx
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
  return (
    <article className={styles.movieCard} onClick={onClick}>
      <img src={movie.poster} alt={movie.title} className={styles.moviePoster} />
      <h3 className={styles.movieTitle}>{movie.title}</h3>
    </article>
  );
}
