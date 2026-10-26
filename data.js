'use strict';
/* =========================================================
   Laravel Mastery Tracker — Initial roadmap & default config
   This data is ONLY used to seed localStorage on first run
   (or when the user explicitly resets). It never overwrites
   saved user changes.
   ========================================================= */
const LMT_SEED = (() => {
  const CATS = [
    { code: 'A', name: 'Core PHP', icon: 'bi-filetype-php',
      docs: ['https://www.php.net/manual/en/', 'https://phptherightway.com/'],
      blurb: 'Solid PHP knowledge is the foundation every Laravel abstraction is built on.',
      practice: 'Write a standalone PHP script or small class library demonstrating "{t}" using strict types, then document what you learned in a README.',
      topics: ['PHP syntax, variables, data types, and operators', 'Arrays, strings, loops, and functions', 'Superglobals, sessions, cookies, and form handling', 'Object-oriented programming', 'Classes, objects, inheritance, encapsulation, and polymorphism', 'Interfaces, abstract classes, and traits', 'Namespaces and autoloading', 'Composer and dependency management', 'Exception handling and custom exceptions', 'Type declarations and strict types', 'Enums, attributes, generators, and iterators', 'Closures and anonymous functions', 'SOLID principles', 'Dependency injection', 'Design patterns', 'PHP-FIG and PSR standards', 'Modern PHP 8+ features', 'Memory management and performance fundamentals', 'Creating and publishing a Composer package'] },
    { code: 'B', name: 'Laravel Framework', icon: 'bi-lightning-charge',
      docs: ['https://laravel.com/docs', 'https://laracasts.com/'],
      blurb: 'Deep framework knowledge lets you use Laravel idiomatically and understand what happens under the hood.',
      practice: 'Implement "{t}" in a fresh Laravel practice app, cover it with at least one feature test, and push it to GitHub.',
      topics: ['Laravel architecture and request lifecycle', 'Routing and route model binding', 'Controllers and Form Requests', 'Blade templates, layouts, components, and slots', 'Middleware', 'Authentication and authorization', 'Gates, Policies, and role-based permissions', 'Service Container', 'Service Providers', 'Dependency Injection', 'Eloquent ORM', 'Relationships, scopes, casts, accessors, and mutators', 'Migrations, seeders, and factories', 'Query Builder', 'Transactions', 'Events, listeners, and observers', 'Notifications and mail', 'Queues, jobs, retries, and failed jobs', 'Task scheduling', 'Cache and Redis', 'File uploads and storage', 'REST API development', 'API Resources and versioning', 'Laravel Sanctum and API authentication', 'Validation and error handling', 'Rate limiting', 'Artisan commands', 'Automated testing', 'Custom packages', 'Laravel performance optimization', 'Laravel Octane concepts', 'Upgrading Laravel applications safely'] },
    { code: 'C', name: 'Database Engineering', icon: 'bi-database',
      docs: ['https://dev.mysql.com/doc/', 'https://www.postgresql.org/docs/'],
      blurb: 'Most production problems are data problems — strong database skills separate senior engineers from the rest.',
      practice: 'Create a sample schema and dataset, then write queries that demonstrate "{t}". Record EXPLAIN output or findings in your notes.',
      topics: ['MySQL fundamentals', 'Advanced SQL queries', 'Primary keys, foreign keys, and constraints', 'Database normalization', 'JOINs, subqueries, CTEs, and aggregate queries', 'Indexes and query optimization', 'EXPLAIN and query analysis', 'Transactions and ACID', 'Isolation levels and concurrency', 'Deadlocks and race conditions', 'Large datasets and efficient pagination', 'Database backup and recovery', 'Safe production migrations', 'Redis fundamentals', 'PostgreSQL fundamentals'] },
    { code: 'D', name: 'Software Architecture', icon: 'bi-diagram-3',
      docs: ['https://refactoring.guru/design-patterns', 'https://martinfowler.com/architecture/'],
      blurb: 'Architecture skills keep large codebases maintainable, testable and easy to change.',
      practice: 'Refactor an existing feature to apply "{t}" and write a short Architecture Decision Record explaining the trade-offs.',
      topics: ['Clean Code', 'SOLID, DRY, KISS, and YAGNI', 'Separation of Concerns', 'MVC architecture', 'Service and Action classes', 'DTOs and Value Objects', 'Repository pattern and its trade-offs', 'Factory, Strategy, Adapter, Observer, and other patterns', 'Domain-Driven Design fundamentals', 'Modular monoliths', 'Event-driven architecture', 'Microservices fundamentals', 'Dependency management', 'Refactoring and technical debt', 'UML and sequence diagrams', 'Architecture Decision Records', 'Code review and maintainability'] },
    { code: 'E', name: 'REST APIs and Integrations', icon: 'bi-plug',
      docs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP', 'https://swagger.io/specification/'],
      blurb: 'Well-designed APIs and reliable integrations are at the heart of modern backend systems.',
      practice: 'Build or extend an API endpoint that demonstrates "{t}", test it with Postman or Pest, and document the contract.',
      topics: ['HTTP methods and status codes', 'REST API design', 'Request and response structures', 'Validation and error responses', 'API Resources', 'API versioning', 'Authentication and authorization', 'OAuth 2.0 and OpenID Connect fundamentals', 'Third-party API integrations', 'Webhooks and signature verification', 'Webhook retries and deduplication', 'Idempotency keys', 'Rate limiting', 'Filtering, sorting, search, and pagination', 'OpenAPI and Swagger documentation', 'API testing and contract testing'] },
    { code: 'F', name: 'Application Security', icon: 'bi-shield-lock',
      docs: ['https://owasp.org/www-project-top-ten/', 'https://cheatsheetseries.owasp.org/'],
      blurb: 'Security is a core responsibility of every senior engineer, not an afterthought.',
      practice: 'Write a vulnerable example of "{t}", then fix it and add an automated test proving the fix.',
      topics: ['Authentication versus authorization', 'Secure password hashing', 'SQL injection prevention', 'Cross-Site Scripting prevention', 'CSRF protection', 'Broken access control and IDOR', 'Mass assignment prevention', 'Session and cookie security', 'CORS configuration', 'File upload security', 'API rate limiting', 'Secrets management', 'HTTPS and secure headers', 'Least-privilege permissions', 'Audit logs', 'Dependency vulnerability scanning', 'OWASP Top 10', 'Privacy and secure data deletion'] },
    { code: 'G', name: 'Automated Testing', icon: 'bi-bug',
      docs: ['https://laravel.com/docs/testing', 'https://pestphp.com/docs'],
      blurb: 'Automated tests give you the confidence to refactor, deploy and scale without fear.',
      practice: 'Add tests covering "{t}" to a practice project and aim for meaningful assertions, not just coverage numbers.',
      topics: ['Unit testing', 'Feature testing', 'Integration testing', 'PHPUnit and Pest', 'Database testing', 'Model factories', 'Mocking and fakes', 'Authentication tests', 'Authorization tests', 'API tests', 'Queue and notification tests', 'Negative and edge-case testing', 'Regression testing', 'Test coverage analysis', 'Continuous integration testing'] },
    { code: 'H', name: 'Git and Developer Tools', icon: 'bi-git',
      docs: ['https://git-scm.com/doc', 'https://www.conventionalcommits.org/'],
      blurb: 'Professional tooling makes you faster, safer and easier to collaborate with.',
      practice: 'Use "{t}" in your daily workflow for a week and write a cheat sheet note with the commands you used.',
      topics: ['Git fundamentals', 'Branching and merging', 'Rebase and conflict resolution', 'Pull requests and code reviews', 'Semantic commits and version tags', 'Composer', 'npm and Vite', 'Linux terminal', 'SSH', 'Environment variables', 'Bash scripting', 'Xdebug', 'Laravel Telescope', 'Postman', 'Static analysis and code formatting'] },
    { code: 'I', name: 'Frontend Skills', icon: 'bi-window',
      docs: ['https://developer.mozilla.org/en-US/docs/Web', 'https://react.dev/learn'],
      blurb: 'Full-stack fluency helps you ship complete features and collaborate with frontend teams.',
      practice: 'Build a small UI component or page demonstrating "{t}" and connect it to a Laravel endpoint where relevant.',
      topics: ['Semantic HTML5', 'CSS3', 'Flexbox and Grid', 'Responsive web design', 'Bootstrap 5', 'JavaScript ES6+', 'DOM manipulation', 'Promises and async/await', 'Fetch API', 'Client-side validation', 'Accessibility fundamentals', 'Blade components', 'Vite', 'React fundamentals', 'React hooks and state', 'React routing', 'Laravel API integration', 'Browser DevTools'] },
    { code: 'J', name: 'Server and DevOps', icon: 'bi-hdd-network',
      docs: ['https://laravel.com/docs/deployment', 'https://docs.docker.com/'],
      blurb: 'Owning your code all the way to production is a defining senior-level capability.',
      practice: 'Apply "{t}" on a local VM, container or low-cost VPS and write a runbook note describing each step.',
      topics: ['Linux server administration', 'Nginx and Apache', 'PHP-FPM', 'Production MySQL', 'DNS and domains', 'SSL/TLS', 'Laravel deployment', 'Laravel optimization commands', 'Queue workers and Supervisor', 'Cron and task scheduling', 'Redis deployment', 'Docker and Docker Compose', 'GitHub Actions', 'CI/CD pipelines', 'Automated deployment', 'Rollback strategy', 'Monitoring and logging', 'Database backup and restoration', 'Disaster recovery', 'Cloud fundamentals', 'Zero-downtime deployment concepts'] },
    { code: 'K', name: 'Performance and Scalability', icon: 'bi-speedometer2',
      docs: ['https://laravel.com/docs/cache', 'https://laravel.com/docs/queues'],
      blurb: 'Performance work requires measuring first, then optimizing the real bottleneck.',
      practice: 'Measure a baseline, apply "{t}", then measure again and record the before/after numbers in your notes.',
      topics: ['Performance profiling', 'N+1 query resolution', 'Database indexing', 'Query optimization', 'Application caching', 'Cache invalidation', 'Redis and background jobs', 'Chunking and batching', 'Streaming large files', 'Concurrency and locking', 'Load and stress testing', 'Horizontal and vertical scaling', 'CDN and object storage', 'Database capacity planning', 'Bottleneck analysis'] },
    { code: 'L', name: 'SaaS Engineering', icon: 'bi-cloud',
      docs: ['https://laravel.com/docs/billing', 'https://stripe.com/docs'],
      blurb: 'SaaS products combine architecture, billing, security and operations into one system.',
      practice: 'Implement a minimal version of "{t}" inside your Multi-Tenant SaaS project and document edge cases.',
      topics: ['Multi-tenant architecture', 'Tenant data isolation', 'Subscription management', 'Payment gateway integration', 'Billing lifecycle', 'Trial and subscription changes', 'Usage metering', 'Plan limits and feature entitlements', 'Organization and team management', 'Audit logs', 'Webhook idempotency', 'Background processing', 'Data import and export', 'Reporting and analytics', 'Feature flags', 'Backup and recovery', 'Operational admin tools'] },
    { code: 'M', name: 'Senior Engineering Skills', icon: 'bi-mortarboard',
      docs: ['https://github.com/donnemartin/system-design-primer', 'https://sre.google/books/'],
      blurb: 'Senior engineers are measured by judgment, communication and the reliability of the systems they own.',
      practice: 'Write a one-page design note or post-mortem style document applying "{t}" to a real or realistic system.',
      topics: ['Algorithms and data structures', 'Time and space complexity', 'Distributed systems fundamentals', 'Message delivery guarantees', 'Eventual consistency', 'Retry, timeout, and backoff patterns', 'Circuit breakers', 'Logs, metrics, and distributed tracing', 'System design', 'Capacity planning', 'Backward-compatible migrations', 'Production incident investigation', 'Root cause analysis', 'Technical documentation', 'Code review and mentoring', 'Architecture trade-offs', 'Technical debt management'] },
    { code: 'N', name: 'AI and Modern Backend', icon: 'bi-cpu',
      docs: ['https://platform.openai.com/docs/overview', 'https://fastapi.tiangolo.com/'],
      blurb: 'Modern backends increasingly integrate AI services and polyglot tooling safely and cost-effectively.',
      practice: 'Build a small, safe proof of concept for "{t}" with validation, error handling and cost/rate-limit awareness.',
      topics: ['AI API integration', 'API usage and cost management', 'Prompt design', 'Structured outputs', 'Asynchronous AI processing', 'Rate limits and retry handling', 'Sensitive data protection', 'AI output validation', 'Evaluation and monitoring', 'Python fundamentals', 'Django and FastAPI fundamentals', 'Embeddings and vector search concepts', 'Reviewing AI-generated code'] },
    { code: 'O', name: 'Advanced Laravel Ecosystem', icon: 'bi-stars',
      docs: ['https://laravel.com/docs/reverb', 'https://livewire.laravel.com/docs', 'https://laravel.com/docs/horizon'],
      blurb: 'The ecosystem tools senior Laravel teams use every day: realtime, Livewire, Inertia, admin panels, monitoring and static analysis.',
      practice: 'Build a minimal working demo of "{t}" inside a sandbox app, then document when you would — and would not — use it in production.',
      topics: ['Laravel Reverb and WebSockets', 'Broadcasting events and channel authorization', 'Livewire fundamentals', 'Livewire components, actions and validation', 'Inertia.js with Vue or React', 'Filament admin panels', 'Laravel Horizon and queue monitoring', 'Laravel Pulse and application health', 'Laravel Scout with Meilisearch', 'Laravel Pennant feature flags', 'Laravel Cashier and Stripe subscriptions', 'Laravel Dusk browser testing', 'Laravel Sail and local development', 'Laravel Prompts and interactive commands', 'Laravel Folio and Volt', 'Blade fragments and view composition', 'PHPStan, Larastan and static analysis', 'Laravel Pint, Rector and code standards', 'Package development with Orchestra Testbench', 'Laravel upgrade and LTS strategy', 'Building a reusable Laravel starter kit'] },
    { code: 'P', name: 'Career, Interview & Leadership', icon: 'bi-person-workspace',
      docs: ['https://larajobs.com/', 'https://github.com/laravel/framework/discussions'],
      blurb: 'The non-code skills that decide whether you are seen as a senior engineer: communication, judgment, mentoring and career strategy.',
      practice: 'Produce a written artefact for "{t}" — an RFC, interview answer, portfolio story or mentoring plan — and get feedback from another developer.',
      topics: ['Technical writing and RFCs', 'System design interview practice', 'Laravel interview drills', 'Portfolio and GitHub storytelling', 'Mentoring and pairing effectively', 'Estimating and planning work', 'Stakeholder communication', 'Running code and architecture reviews', 'Incident commander skills', 'Open-source contribution strategy', 'Freelance and agency client work', 'Salary negotiation and career growth'] }
  ];

  const CROSS = {
    'B-01': ['A-04', 'A-08'], 'D-01': ['A-13'], 'E-02': ['E-01'], 'E-05': ['B-23'],
    'F-01': ['B-06'], 'G-01': ['A-04'], 'J-07': ['B-01'], 'K-01': ['C-07'],
    'L-01': ['B-11', 'D-10'], 'M-09': ['D-12'], 'N-01': ['E-09'], 'I-17': ['B-22']
  };
  const CRIT = ['B', 'C', 'F', 'G'];
  const HOURS = { Beginner: 4, Intermediate: 8, Advanced: 12, Expert: 16 };
  const pad = n => String(n).padStart(2, '0');

  const SKILLS = [
    ['PHP Fundamentals & OOP', 'A'], ['Modern PHP 8+', 'A'], ['Laravel Core', 'B'], ['Eloquent ORM', 'B'],
    ['Queues & Background Jobs', 'B'], ['SQL & Query Optimization', 'C'], ['Database Design', 'C'],
    ['Software Architecture', 'D'], ['Design Patterns', 'D'], ['REST API Design', 'E'],
    ['Integrations & Webhooks', 'E'], ['Application Security', 'F'], ['Automated Testing', 'G'],
    ['Git & Collaboration', 'H'], ['Linux & CLI', 'H'], ['JavaScript & DOM', 'I'], ['React', 'I'],
    ['Deployment & CI/CD', 'J'], ['Docker', 'J'], ['Performance & Caching', 'K'], ['Scalability', 'K'],
    ['SaaS Architecture', 'L'], ['Billing & Payments', 'L'], ['System Design', 'M'],
    ['Incident Response', 'M'], ['Mentoring & Code Review', 'M'], ['AI Integration', 'N'], ['Python', 'N']
  ];

  const PROJECTS = [
    { name: 'Advanced User Management System', difficulty: 'Intermediate', priority: 'High', est: 40,
      description: 'A complete user management module with registration, email verification, two-factor authentication, roles, permissions, policies and an auditable admin panel.',
      topics: ['B-03', 'B-06', 'B-07', 'F-06', 'G-08', 'G-09'],
      features: [['Registration & email verification'], ['Login with two-factor authentication'], ['Roles & permissions', ['Role & Permission models', 'Pivot tables & seeders', 'Policy checks in controllers']], ['Profile management with avatar upload'], ['Admin user table with search, filters & sorting'], ['Audit log of user actions']] },
    { name: 'E-commerce Platform', difficulty: 'Advanced', priority: 'High', est: 80,
      description: 'A production-style store with catalog, cart, checkout, payment gateway integration, order lifecycle, inventory locking and admin reporting.',
      topics: ['B-11', 'B-15', 'C-08', 'C-10', 'E-09', 'E-10', 'K-05'],
      features: [['Product catalog with categories & variants'], ['Cart & checkout flow'], ['Payment gateway integration', ['Create payment intent', 'Verify webhook signatures', 'Handle failed payments']], ['Order management & status history'], ['Inventory with pessimistic locking'], ['Admin sales dashboard']] },
    { name: 'Multi-Tenant SaaS', difficulty: 'Expert', priority: 'Critical', est: 120,
      description: 'A multi-tenant SaaS foundation with tenant isolation, organizations & teams, subscriptions, plan limits, feature flags and operational admin tools.',
      topics: ['L-01', 'L-02', 'L-03', 'L-05', 'L-08', 'L-09', 'L-15'],
      features: [['Tenant identification & scoping'], ['Organizations, teams & invitations'], ['Subscription plans & trials', ['Plan definitions', 'Trial handling', 'Upgrade / downgrade flow']], ['Plan limits & feature entitlements'], ['Usage metering'], ['Super-admin operational tools']] },
    { name: 'Social Media Automation', difficulty: 'Advanced', priority: 'Medium', est: 60,
      description: 'A scheduler that connects social accounts via OAuth, queues posts, retries failures with backoff and optionally drafts captions with an AI API.',
      topics: ['B-18', 'B-19', 'E-08', 'E-09', 'M-06', 'N-01'],
      features: [['OAuth account connection'], ['Post composer & media uploads'], ['Scheduled publishing with queues', ['Job per post', 'Retry with exponential backoff', 'Failed job dashboard']], ['AI caption suggestions with validation'], ['Analytics per post']] },
    { name: 'Production-Ready REST API', difficulty: 'Advanced', priority: 'High', est: 50,
      description: 'A versioned, documented and fully tested REST API with Sanctum authentication, rate limiting, idempotency keys and consistent error responses.',
      topics: ['B-24', 'E-02', 'E-04', 'E-06', 'E-12', 'E-15', 'G-10'],
      features: [['Versioned routes (v1)'], ['Sanctum token authentication'], ['API Resources & consistent error format'], ['Filtering, sorting & pagination'], ['Idempotency key middleware'], ['OpenAPI documentation']] },
    { name: 'Production Deployment System', difficulty: 'Advanced', priority: 'High', est: 40,
      description: 'A repeatable deployment pipeline with Docker, GitHub Actions, queue workers under Supervisor, zero-downtime releases, monitoring and rollback.',
      topics: ['J-07', 'J-09', 'J-12', 'J-13', 'J-16', 'J-17', 'J-21'],
      features: [['Dockerized local environment'], ['GitHub Actions CI pipeline'], ['Automated deployment', ['Build artifacts', 'Run migrations safely', 'Atomic symlink switch']], ['Supervisor queue workers'], ['Monitoring, logging & alerts'], ['Documented rollback procedure']] },
    { name: 'Blade Component Kit', difficulty: 'Beginner', priority: 'Medium', est: 12,
      description: 'STARTER PROJECT — Build a small reusable Blade component library: alert, button, modal, form input with error state and a data table. This is the ideal first portfolio piece for completing frontend and Blade topics.',
      topics: ['I-12', 'I-01', 'I-02', 'B-04', 'G-02'],
      features: [['Alert component with variants'], ['Button + icon component'], ['Form input with validation error state', ['Old-value + error binding', 'Accessible label & described-by']], ['Reusable modal component'], ['Responsive data table component']] },
    { name: 'URL Shortener API', difficulty: 'Beginner', priority: 'Medium', est: 15,
      description: 'STARTER PROJECT — A compact Laravel API that shortens URLs, redirects with 301s, tracks click counts and expires links. Perfect for revising routing, validation, migrations and basic tests.',
      topics: ['B-02', 'B-13', 'B-22', 'E-01', 'G-01', 'E-13'],
      features: [['Create short link with validation'], ['Redirect + click counter'], ['Link expiry handling'], ['Feature tests for creation & redirect'], ['Simple JSON error format']] },
    { name: 'Blog with Roles & Admin', difficulty: 'Intermediate', priority: 'High', est: 30,
      description: 'A classic full-feature CRUD application with posts, categories, comments, image uploads, role-based admin access, search and pagination. Great evidence for Laravel fundamentals.',
      topics: ['B-03', 'B-04', 'B-07', 'B-11', 'B-21', 'C-06', 'G-03'],
      features: [['Public post listing with search & pagination'], ['Admin CRUD for posts & categories', ['Slug generation', 'Image upload & cleanup', 'Policy-protected actions']], ['Comments with validation'], ['Role-based access control'], ['Feature tests for admin routes']] },
    { name: 'Task Manager REST API', difficulty: 'Intermediate', priority: 'High', est: 25,
      description: 'A polished API-only project: users, projects, tasks, filters, pagination, API resources, Sanctum tokens, rate limiting and API tests. A strong stepping stone to the production API project.',
      topics: ['B-22', 'B-24', 'E-03', 'E-05', 'E-14', 'G-10', 'F-11'],
      features: [['CRUD for projects & tasks'], ['Filtering, sorting & pagination', ['Query filter classes', 'Stable pagination ordering']], ['API resources & consistent errors'], ['Sanctum token auth'], ['Rate limiting per user'], ['API tests for every endpoint']] },
    { name: 'Queue-Powered Invoice Service', difficulty: 'Advanced', priority: 'Medium', est: 35,
      description: 'Generate PDF invoices through queued jobs, store them on object storage, retry failed jobs with backoff, notify customers and expose a small status API. Excellent evidence for queue and reliability skills.',
      topics: ['B-15', 'B-18', 'B-17', 'K-07', 'M-06', 'H-13', 'J-09'],
      features: [['Queued PDF generation'], ['Object storage uploads'], ['Idempotent job handling', ['Unique job keys', 'Retry & backoff policy', 'Failed-job review UI']], ['Email notification on completion'], ['Signed, expiring download URLs'], ['Tests with Queue::fake & Storage::fake']] },
    { name: 'Realtime Notification Platform', difficulty: 'Expert', priority: 'Medium', est: 45,
      description: 'A realtime notification system using Laravel Reverb, private channels, authorization callbacks, queued broadcasting, read receipts and fallback email digests. Demonstrates modern realtime architecture.',
      topics: ['O-01', 'O-02', 'B-18', 'B-16', 'F-14', 'M-03', 'J-12'],
      features: [['Private user notification channels'], ['Channel authorization rules'], ['Queued broadcast events'], ['Read / unread state & API'], ['Fallback email digest job'], ['Horizontal scaling notes for Reverb']] }
  ];

  const ROUTINE = [
    { title: 'Learn concepts and documentation', minutes: 45 },
    { title: 'Write code and implement features', minutes: 90 },
    { title: 'Testing, debugging, and refactoring', minutes: 30 },
    { title: 'Notes, Git commits, and review', minutes: 15 }
  ];

  const SETTINGS = { theme: 'dark', name: 'Laravel Developer', role: 'Aspiring Senior Engineer', dailyTarget: 180, weeklyTargetHours: 21, sidebarCollapsed: false };

  let seq = 0;
  const id = p => p + '-' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

  function defaults() {
    return {
      version: 1, categories: [], topics: [], projects: [], projectHistory: [], skills: [], notes: [],
      days: {}, weeklyReviews: {}, activity: [],
      routineTemplate: ROUTINE.map(r => ({ id: id('rt'), title: r.title, minutes: r.minutes, topicId: '' })),
      settings: Object.assign({}, SETTINGS)
    };
  }

  function buildRoadmap() {
    const now = new Date().toISOString();
    const categories = [], topics = [];
    CATS.forEach((c, ci) => {
      const catId = 'cat-' + c.code;
      categories.push({ id: catId, code: c.code, name: c.name, icon: c.icon, description: c.blurb, order: ci, custom: false });
      const n = c.topics.length;
      c.topics.forEach((title, i) => {
        const r = i / n;
        const difficulty = r < 0.3 ? 'Beginner' : r < 0.65 ? 'Intermediate' : r < 0.9 ? 'Advanced' : 'Expert';
        const crit = CRIT.includes(c.code);
        const priority = difficulty === 'Beginner' || difficulty === 'Intermediate' ? (crit ? 'Critical' : 'High') : difficulty === 'Advanced' ? (crit ? 'High' : 'Medium') : 'Medium';
        const tid = `${c.code}-${pad(i + 1)}`;
        const prerequisites = [];
        if (i > 0) prerequisites.push(`${c.code}-${pad(i)}`);
        (CROSS[tid] || []).forEach(p => { if (!prerequisites.includes(p)) prerequisites.push(p); });
        topics.push({
          id: tid, categoryId: catId, title,
          description: `${title}. ${c.blurb} Learn the core concepts, apply them in a real codebase, and be able to explain the trade-offs, edge cases and common pitfalls to other developers.`,
          difficulty, priority, hours: HOURS[difficulty], prerequisites,
          status: 'Not Started', progress: 0, startDate: '', targetDate: '', completionDate: '',
          notes: '', resources: c.docs.slice(), practiceTask: c.practice.replace('{t}', title),
          evidenceUrl: '', githubUrl: '', demoUrl: '', custom: false, createdAt: now, updatedAt: now
        });
      });
    });
    return { categories, topics };
  }

  function buildProjects() {
    const chk = arr => arr.map(t => ({ id: id('ci'), text: t, done: false }));
    return PROJECTS.map((p, i) => ({
      id: 'PRJ-' + pad(i + 1), name: p.name, description: p.description, difficulty: p.difficulty,
      status: 'Planned', priority: p.priority, startDate: '', targetDate: '', completionDate: '',
      estimatedHours: p.est, actualHours: 0, githubUrl: '', demoUrl: '', docsUrl: '', imageUrl: '',
      topics: p.topics.slice(),
      features: p.features.map(f => ({ id: id('ci'), text: f[0], done: false, subtasks: chk(f[1] || []) })),
      testing: chk(['Feature tests for main flows', 'Authorization & validation tests', 'Edge-case and failure tests', 'CI pipeline runs all tests']),
      deployment: chk(['Environment variables documented', 'Migrations tested on staging', 'Queue workers & scheduler configured', 'Production deployment verified', 'Monitoring & backups enabled']),
      notes: '', progressMode: 'auto', manualProgress: 0, history: [{ date: new Date().toISOString(), event: 'Project created' }]
    }));
  }

  function build() {
    const s = defaults();
    const r = buildRoadmap();
    s.categories = r.categories; s.topics = r.topics;
    s.projects = buildProjects();
    s.skills = SKILLS.map(([name, code], i) => ({
      id: 'SK-' + pad(i + 1), name, categoryId: 'cat-' + code, level: 'Not Evaluated',
      lastAssessed: '', evidenceUrl: '', notes: '', nextTarget: '', history: []
    }));
    s.activity = [{ id: id('act'), ts: new Date().toISOString(), type: 'system', text: 'Roadmap initialised with default Laravel Senior curriculum', ref: null }];
    return s;
  }

  return { build, defaults, buildRoadmap, SETTINGS };
})();
