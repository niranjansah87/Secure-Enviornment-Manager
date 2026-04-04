# Contributing to Secure Environment Manager

First off, thank you for considering contributing to Secure Environment Manager! It's people like you that make it a great tool.

## Getting Started

### Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Secure-Environment-Manager.git
   cd Secure-Environment-Manager
   ```

### Setup Environment

1. **Backend (Python):**
   ```bash
   pip install -r requirements.txt
   python scripts/generate_keys.py
   # Create .env with necessary keys (see .env.example)
   python app.py
   ```

2. **Frontend (Next.js):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development Guidelines

### Project Structure

- `app.py`: Main Flask entry point.
- `frontend/`: Next.js 14 application.
- `scripts/`: Utility and CLI scripts.
- `data/`: Local storage for encrypted environment files (ignored by git).
- `audit_logs/`: Local storage for audit logs (ignored by git).

### Coding Standards

- **Python**: Follow PEP 8 guidelines. Use meaningful variable names and include docstrings for new functions.
- **Frontend**: Use TypeScript and React functional components. Follow the existing style with Tailwind CSS and Radix UI (shadcn).

## Commit Guidelines

We use conventional-style commit messages:

- `feat:` for new features.
- `fix:` for bug fixes.
- `docs:` for documentation changes.
- `style:` for formatting, missing semi-colons, etc.
- `refactor:` for code changes that neither fix a bug nor add a feature.
- `test:` for adding missing tests or correcting existing tests.

**Example**:
`feat: add bulk export to JSON in the dashboard`

## Pull Request Process

1. Create a new branch for your feature or fix: `git checkout -b feature/your-feature-name`.
2. Make your changes and commit them with descriptive messages.
3. Push your branch to your fork: `git push origin feature/your-feature-name`.
4. Open a Pull Request from your branch to the `main` branch of the original repository.
5. Provide a clear description of the changes and link any related issues.
6. Once the CI checks pass and the code is reviewed, it will be merged.

## Code of Conduct

Help us keep Secure Environment Manager a welcoming and inclusive project:

- Be respectful and professional.
- Avoid toxic behavior and personal attacks.
- Focus on constructive feedback and collaboration.
