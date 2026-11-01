import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RolProvider } from './context/RolContext';
import { AppRoutes } from './routes/AppRoutes';
import { ToastViewport } from './components/ui/Toast';

function App() {
  return (
    <BrowserRouter basename="/cuadrecaja">
      <AuthProvider>
        <SocketProvider>
          <RolProvider>
            <ToastViewport />
            <AppRoutes />
          </RolProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;