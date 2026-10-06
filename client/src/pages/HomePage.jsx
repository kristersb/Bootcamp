import { useEffect, useState } from 'react'

function HomePage() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then(({ success, data, error }) => {
        setMessage(success ? data.message : error)
      })
      .catch(() => setMessage('Could not reach the server.'))
  }, [])

  return (
    <div className="app">
      <h1>Bootcamp App</h1>
      <p>{message}</p>
    </div>
  )
}

export default HomePage
