<div align="center">


# ✨ ChatApplications – Real-Time Messaging Redefined ✨

> 🚀 Connect, collaborate, and chat in real-time with a modern, feature-rich messaging platform for groups and individuals.

[![React](https://img.shields.io/badge/React-2023-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=1e1e1e)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strongly%20Typed-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=1e1e1e)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Fast%20Build-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=1e1e1e)](https://vitejs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-RealTime-010101?style=for-the-badge&logo=socketdotio&logoColor=white&labelColor=1e1e1e)](https://socket.io/)
[![Node.js](https://img.shields.io/badge/Node.js-BackEnd-339933?style=for-the-badge&logo=node.js&logoColor=white&labelColor=1e1e1e)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-Minimal%20Server-000000?style=for-the-badge&logo=express&logoColor=white&labelColor=1e1e1e)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white&labelColor=1e1e1e)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white&labelColor=1e1e1e)](https://vercel.com/)

[![GitHub stars](https://img.shields.io/github/stars/kashishchadha/ChatApplications?style=social)](https://github.com/kashishchadha/ChatApplications/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/kashishchadha/ChatApplications?style=social)](https://github.com/kashishchadha/ChatApplications/network/members)
[![GitHub issues](https://img.shields.io/github/issues/kashishchadha/ChatApplications?style=social)](https://github.com/kashishchadha/ChatApplications/issues)

---

</div>

## ✨ Key Features

- 💬 **1-to-1 & Group Messaging:** Seamless conversations with individuals and teams
- 🚀 **Real-Time Chat:** Powered by Socket.io for instant message delivery
- 🗂️ **Group Creation & Management:** Create, edit, and manage groups and members
- 👀 **Read & Delivery Receipts:** Know when your messages are delivered or read
- 🟢 **Online Status Indicators:** See who's online in real-time
- 📁 **File & Image Sharing:** Attach files, images, and more in your chats
- 😀 **Emoji Support:** Express yourself with emoji reactions
- 📱 **Mobile Responsive:** Optimized experience for phones, tablets, and desktops
- 🛡️ **Admin Controls:** Group admins can manage members and permissions
- 🔒 **Secure Authentication:** (custom implementation, OAuth ready)
- 🌙 **Dark & Light Modes:** Comfortable for any environment
- 🎨 **Modern UI/UX:** Sleek, intuitive, and accessible design

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB URI (for backend, if enabled)
- [Optional] Vercel account (for deployment)

### 1. Clone the Repository

```bash
git clone https://github.com/kashishchadha/ChatApplications.git
cd ChatApplications
```

### 2. Install Dependencies

#### Frontend

```bash
cd client
npm install
# or
yarn install
```

#### Backend (if available)

```bash
cd ../server
npm install
# or
yarn install
```

### 3. Configure Environment Variables

#### Frontend (`client/.env`)

```
VITE_API_BASE_URL=http://localhost:5000
```

#### Backend (`server/.env`)

```
PORT=5000
MONGO_URI=your_mongodb_uri
CLIENT_URL=http://localhost:5173
```

### 4. Run the Application

#### Backend

```bash
cd server
npm run dev
```

#### Frontend

```bash
cd client
npm run dev
```

Access the app at [http://localhost:5173](http://localhost:5173)

---

## 🛠️ Tech Stack

**Frontend:**  
- React
- TypeScript
- Vite
- Custom CSS

**Backend:**  
- Node.js
- Express.js
- MongoDB
- Socket.io

**Deployment:**  
- Vercel (frontend)
- [Custom/Cloud] (backend)

---

## 📁 Environment Variables

| Variable            | Description                 | Example                       |
|---------------------|-----------------------------|-------------------------------|
| `VITE_API_BASE_URL` | Frontend API endpoint       | http://localhost:5000         |
| `PORT`              | Backend server port         | 5000                          |
| `MONGO_URI`         | MongoDB connection string   | mongodb+srv://...             |
| `CLIENT_URL`        | Frontend URL                | http://localhost:5173         |

---

## 💻 Development Scripts

| Command          | Description                      |
|------------------|----------------------------------|
| `npm run dev`    | Start app in development mode    |
| `npm run build`  | Build for production             |
| `npm run start`  | Start production build           |

---

## 🤝 Contributing

We welcome contributions!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## 📝 License

This project is currently unlicensed. If you'd like to add a license, update this section.

---

<div align="center">

Made with ❤️ by [kashishchadha](https://github.com/kashishchadha)

</div>
