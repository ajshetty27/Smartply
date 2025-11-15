# Contributing to Smartply

Thank you for your interest in contributing to Smartply! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/Smartply/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (OS, Python/Node versions)

### Suggesting Features

1. Check [Issues](https://github.com/yourusername/Smartply/issues) for similar suggestions
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach

### Pull Requests

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/Smartply.git
   cd Smartply
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes**
   - Write clear, commented code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   # Backend
   cd backend
   pytest
   
   # Frontend
   cd frontend
   npm run test
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve bug"
   ```

   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Fill in the PR template
   - Link related issues

## Development Setup

See [README.md](README.md) for detailed setup instructions.

### Quick Start

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Code Style

### Python (Backend)
- Follow PEP 8
- Use type hints
- Write docstrings for functions
- Keep functions focused and small

### TypeScript (Frontend)
- Use functional components
- Prefer hooks over class components
- Use TypeScript interfaces
- Follow React best practices

### CSS
- Use Tailwind CSS utility classes
- Avoid custom CSS when possible
- Follow mobile-first approach

## Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Documentation

- Update README.md for major changes
- Add JSDoc/docstrings for new functions
- Update API documentation if endpoints change

## Questions?

Feel free to:
- Open an issue for discussion
- Reach out to maintainers
- Check existing documentation

Thank you for contributing to Smartply! 🚀
