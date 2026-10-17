import { AuthLayout } from '../layouts/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';

export function Login() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

export default Login;
