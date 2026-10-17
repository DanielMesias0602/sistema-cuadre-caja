import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RolProvider } from './context/RolContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter basename="/cuadrecaja">
      <AuthProvider>
        <RolProvider>
          <AppRoutes />
        </RolProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;