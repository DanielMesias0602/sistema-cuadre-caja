import { useEffect, useState } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('Conectando...');

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then((response) => response.json())
      .then((data) => {
        setBackendStatus(`${data.status} - ${data.service}`);
      })
      .catch(() => {
        setBackendStatus('Error de conexión con el backend');
      });
  }, []);

  return (
    <div>
      <h1>Sistema de Cuadre de Caja</h1>
      <p>Estado del backend: {backendStatus}</p>
    </div>
  );
}

export default App;