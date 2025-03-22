import { useEffect, useState } from 'react'
import './App.css'
import Search from './components/Search'
import Spinner from './components/Spinner';
import Card from './components/Card';
import { useDebounce } from "react-use"


const API_BASE_URL = "https://api.themoviedb.org/3";

const API_KEY = import.meta.env.VITE_TMDB_API_TOKEN;


const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: "Bearer "+ API_KEY
  }
}

function App() {

  const [searchTerm,setSearchTerm] = useState("");

  const [errorMessage,setErrorMessage] = useState("");

  const [movieList,setMovieList] = useState([]);

  const [isLoading,setIsLoading] = useState(false);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useDebounce(()=>
  {
    setDebouncedSearchTerm(searchTerm)}, 500, [searchTerm]
  )

  const fetchMovies = async (query = " ") =>
  {

    setIsLoading(true);

    setErrorMessage("");

    try {


      const endpoint =  query ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}` :`${API_BASE_URL}/discover/movie?sort_by=popularity.desc`

      const response = await fetch(endpoint, API_OPTIONS);

      if(!response.ok)
      {
        throw new Error("failed to fetch movies")
      }

      const data = await response.json();

     if(data.Response === "False")
     {
      setErrorMessage(data.Error || "Failed to fetch movies");
      setMovieList([]);
      return;
     }

     setMovieList(data.results || []);


      
    } catch (error) {

      console.error(`Error fetching movies : ${error}`);
      setErrorMessage("Error fetching movies. Please try again later.")
      
    }
    finally{
      setIsLoading(false);
    }
  }

  useEffect(()=>
  {

    fetchMovies(debouncedSearchTerm);


  },[debouncedSearchTerm])
  

  
  return (
   <main>

    <div className='pattern'/>

  <div className='wrapper'>

    <header className='mt-[5px]'>
      <h1><span className='text-white'>Snyder.</span></h1>
      <img src='/hero-img (2).png'></img>
      <h1 className='text-gradient'> Find Movies You'll Enjoy Without the Hassle </h1>
      <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm}></Search>
    </header>

    <section className='all-movies'>

   
    <h2 className='mt-[50px]'>All Movies</h2>

    {isLoading ? (<Spinner></Spinner>): errorMessage ? (<p className='text-red-500'>{errorMessage}</p>) : (
      
    <ul>
      {movieList.map((movie)=>
      (

        <Card key={movie.id} movie = {movie}></Card>

      ))}
    

    </ul>
    )}

    {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
    </section>
   
  </div>

   </main>
  )
}

export default App
