# ⏱️ App de Controle de Ponto

Aplicação web desenvolvida para facilitar o controle da jornada de trabalho, permitindo registrar horários de entrada, saída e intervalo, acompanhar o saldo de horas e visualizar a previsão de término da jornada.

O projeto foi desenvolvido com foco em **simplicidade, usabilidade e acesso rápido**, podendo ser utilizado diretamente pelo navegador.

---

## 🚀 Funcionalidades

* 🔐 Sistema de autenticação de usuários
* 👤 Perfil com nome e foto
* 🕐 Registro de entrada
* 🍽️ Registro e controle do intervalo
* 🏁 Registro de saída
* 📊 Cálculo automático da jornada
* ⏰ Previsão de horário de saída
* ➕ Cálculo de saldo positivo de horas
* ➖ Identificação de saldo negativo
* 📅 Controle da jornada por dia
* 🇧🇷 Consideração do calendário de feriados
* 💾 Persistência dos dados no Supabase
* 📱 Interface responsiva
* ☁️ Deploy online pela Vercel

---

## 🧮 Como funciona

A aplicação utiliza a jornada diária configurada para calcular automaticamente o horário previsto de saída.

### Exemplo

```text
Entrada:        08:00
Intervalo:      12:00 → 13:00
Jornada:        8h48

Saída prevista: 17:48
```

O sistema também permite acompanhar o **saldo de horas**, facilitando a identificação de horas positivas ou negativas ao longo dos dias.

---

## 🛠️ Tecnologias

| Tecnologia | Utilização                    |
| ---------- | ----------------------------- |
| HTML5      | Estrutura da aplicação        |
| CSS3       | Interface e responsividade    |
| JavaScript | Lógica e funcionalidades      |
| Supabase   | Banco de dados e autenticação |
| Vercel     | Hospedagem e deploy           |
| GitHub     | Versionamento                 |

---

## 📁 Estrutura do projeto

```text
app-de-ponto/
│
├── index.html
├── dashboard.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── dashboard.js
│   ├── ponto.js
│   └── profile.js
│
├── assets/
│   ├── images/
│   └── icons/
│
└── README.md
```

> A estrutura pode variar conforme a versão atual do projeto.

---

## 🔐 Autenticação

A autenticação dos usuários é realizada através do **Supabase Auth**.

Cada usuário possui sua própria sessão e seus dados são associados ao respectivo perfil.

O projeto também utiliza o Supabase para armazenamento das informações relacionadas ao controle de ponto e perfil dos usuários.

---

## 👤 Perfil do usuário

O sistema permite que o usuário mantenha informações básicas do seu perfil, incluindo:

* Nome
* Foto de perfil
* Dados vinculados à conta

As imagens de perfil são armazenadas utilizando o **Supabase Storage**.

---

## 📅 Jornada e saldo de horas

O sistema foi desenvolvido considerando uma jornada diária de:

**8 horas e 48 minutos**

O intervalo para almoço é contabilizado separadamente e não entra no cálculo da jornada trabalhada.

A aplicação utiliza os horários registrados para calcular:

* Tempo trabalhado
* Tempo de intervalo
* Horário previsto de saída
* Saldo diário
* Horas positivas
* Horas negativas

---

## 🇧🇷 Feriados

O sistema possui lógica para considerar feriados no calendário da aplicação, evitando que o usuário registre uma jornada normalmente em datas que não possuem expediente.

---

## 🌐 Deploy

A aplicação pode ser publicada utilizando a **Vercel**, conectando o repositório do GitHub ao projeto.

Fluxo utilizado:

```text
GitHub
   ↓
Vercel
   ↓
Deploy automático
   ↓
Aplicação Web
```

A cada atualização enviada para o repositório, a Vercel pode realizar um novo deploy automaticamente.

---

## ⚙️ Configuração

Para executar o projeto localmente:

### 1. Clone o repositório

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
```

### 2. Entre na pasta

```bash
cd SEU-REPOSITORIO
```

### 3. Configure o Supabase

Crie um projeto no Supabase e configure:

* Authentication
* Database
* Storage
* Policies de acesso

As credenciais do projeto devem ser configuradas no código conforme a estrutura utilizada pela aplicação.

> **Importante:** nunca publique chaves privadas, service keys ou credenciais sensíveis no GitHub.

---

## 📌 Objetivo do projeto

O projeto nasceu da necessidade de tornar o acompanhamento da jornada de trabalho mais simples e visual.

A proposta é reduzir a necessidade de cálculos manuais, permitindo que o usuário saiba rapidamente:

> **"Que horas eu posso sair hoje?"**

Além disso, o acompanhamento do saldo de horas ajuda a evitar o acúmulo inesperado de horas negativas.

---

## 🎨 Interface

A interface foi desenvolvida buscando uma experiência moderna, responsiva e inspirada em aplicações digitais contemporâneas, com foco em:

* Hierarquia visual
* Informações objetivas
* Feedback visual
* Responsividade
* Facilidade de uso

---

## 🔮 Próximos passos

Possíveis melhorias futuras:

* [ ] Dashboard com gráficos de horas
* [ ] Relatório mensal
* [ ] Exportação para PDF
* [ ] Exportação para Excel
* [ ] Histórico completo de ponto
* [ ] Notificações de horário
* [ ] PWA para instalação no celular
* [ ] Modo escuro aprimorado
* [ ] Gestão de diferentes jornadas
* [ ] Sistema de banco de horas
* [ ] Calendário visual da jornada
* [ ] Melhorias de acessibilidade

---

## 📄 Licença

Este projeto foi desenvolvido para fins de estudo, produtividade e experimentação com desenvolvimento web.


---

## 👨‍💻 Desenvolvido por

**Gabriel ROcha**

Projeto desenvolvido utilizando:

`HTML` · `CSS` · `JavaScript` · `Supabase` · `Vercel` · `GitHub`
