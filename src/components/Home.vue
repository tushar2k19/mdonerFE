<template>
  <div class="home-container">
    <!-- Task diagram with three nodes -->
    <div class="task-diagram">
      <!-- Nodes -->
      <div class="task-node task-1">Task 1</div>
      <div class="task-node task-2">Task 2</div>
      <div class="task-node task-3">Task 3</div>

      <!-- Background circle -->
      <div class="circle-background"></div>

      <!-- Connecting lines -->
      <div class="connections">
        <div class="connection-vertical"></div>
        <div class="connection-horizontal"></div>
      </div>
    </div>

    <!-- Main notepad card -->
    <div class="content-card">
      <h1 class="card-title">NE<span style="color: #009951">volve</span></h1>
      <div class="card-lines">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </div>

    <!-- Welcome text -->
    <div class="welcome-section">
      <h2>Welcome to Home page of NEvolve</h2>
      <p>A Smart task management tool prioritizing progress<br>for effective governance</p>
    </div>

    <!-- Dashboard button -->
    <router-link to="/tentative" class="dashboard-button">
      Go to Dashboard
    </router-link>
  </div>
</template>

<style scoped>
.home-container {
  height: 100vh; /* Exactly viewport height */
  width: 100vw;
  background-color: #0052CC;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  box-sizing: border-box;
  gap: 1.5rem; /* Reduced gap between elements */
  overflow: hidden;
}

/* Task diagram styling */
.task-diagram {
  position: relative;
  width: 300px;
  height: 120px; /* Reduced height */
  margin-bottom: -1rem;
}

/* Background circle for the diagram */
.circle-background {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  z-index: 1;
}

.task-node {
  position: absolute;
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2);
  z-index: 3;
}

.task-1 {
  left: 44%;
  transform: translateX(-50%);
}

.task-2 {
  bottom: 33px; /* Moved the task-2 node down slightly */
  left: 20%;
  transform: translateX(10%);
}

.task-3 {
  bottom: 33px; /* Moved the task-3 node down slightly */
  right: 20%;
  transform: translateX(50%);
}

/* Connections between nodes */
.connections {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.connection-vertical {
  position: absolute;
  width: 4px;
  height: 50px;
  background: white;
  left: 50%;
  transform: translateX(-50%);
}

.connection-horizontal {
  position: absolute;
  width: 150px;
  height: 4px;
  background: white;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
}

/* Content card styling */
.content-card {
  background: white;
  border-radius: 20px;
  width: 280px; /* Slightly smaller card */
  padding: 1.25rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-title {
  color: #0052CC;
  font-size: 1.25rem; /* Smaller font */
  font-weight: 600;
  margin: 0 0 1rem 0;
  text-align: center;
}

.card-lines {
  display: flex;
  flex-direction: column;
  gap: 0.6rem; /* Reduced gap */
}

.line {
  height: 10px; /* Slightly smaller lines */
  background: #F4F5F7;
  border-radius: 5px;
}

/* Welcome section */
.welcome-section {
  text-align: center;
  color: white;
  margin-bottom: 0.5rem; /* Reduced margin */
}

.welcome-section h2 {
  font-size: 1.5rem; /* Smaller font */
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.welcome-section p {
  font-size: 1rem; /* Smaller font */
  line-height: 1.4;
  opacity: 0.9;
  margin: 0;
}

/* Dashboard button */
.dashboard-button {
  background: white;
  color: #0052CC;
  padding: 0.6rem 1.75rem; /* Smaller padding */
  border-radius: 50px;
  font-size: 0.95rem; /* Smaller font */
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

/* Animation keyframes remain the same */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply animations to elements */
.task-node,
.connections,
.content-card,
.welcome-section,
.dashboard-button {
  animation: fadeIn 0.8s ease-out forwards;
}

/* Animation delays */
.task-1 { animation-delay: 0.2s; }
.task-2 { animation-delay: 0.3s; }
.task-3 { animation-delay: 0.4s; }
.connections { animation-delay: 0.5s; }
.content-card { animation-delay: 0.6s; }
.welcome-section { animation-delay: 0.7s; }
.dashboard-button { animation-delay: 0.8s; }

/* Responsive adjustments */
@media (max-height: 600px) {
  .home-container {
    gap: 1rem;
  }

  .task-diagram {
    height: 100px;
  }

  .welcome-section h2 {
    font-size: 1.25rem;
  }

  .welcome-section p {
    font-size: 0.9rem;
  }
}
</style>
