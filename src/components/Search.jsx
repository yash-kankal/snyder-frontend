import React, { useState } from 'react'

function Search( {searchTerm, setSearchTerm}) {

   

  return (
    <div className='search'>

        <img src='/Vector.svg' alt='search' style={{
            marginLeft: 235,
            marginTop: 9

        }}></img>

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