import SearchIcon from './SearchIcon'

function Search( {searchTerm, setSearchTerm}) {

   

  return (
    <div className='search'>

        <SearchIcon className="search-icon" />

        <input type='text' placeholder='Search through thousands of movies' value={searchTerm} onChange={(e)=>
            {
                setSearchTerm(e.target.value);
            }
        }>

        </input>
        </div>
  )
}

export default Search
