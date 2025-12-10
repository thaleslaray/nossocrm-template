import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { supabase } from '@/lib/supabase';

// Mock apenas da chamada de API do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização do formulário', () => {
    it('deve renderizar o formulário de login corretamente', () => {
      renderLogin();

      expect(screen.getByRole('heading', { name: /bem-vindo de volta/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('deve ter campos de email e senha vazios inicialmente', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });

    it('deve ter o campo de email com tipo "email"', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('deve ter o campo de senha com tipo "password"', () => {
      renderLogin();

      const passwordInput = screen.getByLabelText(/senha/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('deve ter campos obrigatórios', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Comportamento do formulário', () => {
    it('deve permitir digitar no campo de email', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'teste@email.com');

      expect(emailInput).toHaveValue('teste@email.com');
    });

    it('deve permitir digitar no campo de senha', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByLabelText(/senha/i);
      await user.type(passwordInput, 'minhasenha123');

      expect(passwordInput).toHaveValue('minhasenha123');
    });

    it('deve mostrar loading ao submeter o formulário', async () => {
      const user = userEvent.setup();

      // Mock que demora para responder
      (supabase.auth.signInWithPassword as Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'teste@email.com');
      await user.type(screen.getByLabelText(/senha/i), 'senha123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Botão deve estar desabilitado durante o loading
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('deve desabilitar o botão durante o carregamento', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 200))
      );

      renderLogin();

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      expect(submitButton).not.toBeDisabled();

      await user.type(screen.getByLabelText(/email/i), 'teste@email.com');
      await user.type(screen.getByLabelText(/senha/i), 'senha123');
      await user.click(submitButton);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Login com credenciais corretas', () => {
    it('deve chamar signInWithPassword com email e senha corretos', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({ error: null });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaCorreta123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'usuario@exemplo.com',
        password: 'senhaCorreta123',
      });
    });

    it('deve navegar para a página inicial após login bem-sucedido', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({ error: null });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaCorreta123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('não deve exibir mensagem de erro após login bem-sucedido', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({ error: null });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaCorreta123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.queryByText(/falha|erro|inválido/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Login com credenciais inválidas', () => {
    it('deve exibir mensagem de erro quando a API retorna erro de credenciais inválidas', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaErrada');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro genérica quando erro não tem mensagem', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        error: {},
      });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaErrada');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Erro desconhecido.')).toBeInTheDocument();
      });
    });

    it('não deve navegar quando o login falha', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaErrada');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('deve reabilitar o botão após erro de login', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaErrada');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled();
      });
    });

    it('deve permitir nova tentativa após erro', async () => {
      const user = userEvent.setup();

      // Primeira tentativa falha
      (supabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
        error: { message: 'Invalid login credentials' },
      });
      // Segunda tentativa sucesso
      (supabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
        error: null,
      });

      renderLogin();

      // Primeira tentativa
      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaErrada');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument();
      });

      // Limpa e tenta novamente com senha correta
      await user.clear(screen.getByLabelText(/senha/i));
      await user.type(screen.getByLabelText(/senha/i), 'senhaCorreta');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('deve limpar erro anterior ao submeter novamente', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      renderLogin();

      // Primeira submissão com erro
      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senhaErrada');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument();
      });

      // Mock agora demora para responder
      (supabase.auth.signInWithPassword as Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      // Segunda submissão - erro deve sumir durante o loading
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Durante o loading, o erro anterior deve ter sido limpo
      await waitFor(() => {
        expect(screen.queryByText('Email ou senha incorretos.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Erros de rede/servidor', () => {
    it('deve exibir mensagem de erro quando a API lança exceção', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senha123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem genérica quando exceção não tem mensagem', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as Mock).mockRejectedValue({});

      renderLogin();

      await user.type(screen.getByLabelText(/email/i), 'usuario@exemplo.com');
      await user.type(screen.getByLabelText(/senha/i), 'senha123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Erro desconhecido.')).toBeInTheDocument();
      });
    });
  });
});
