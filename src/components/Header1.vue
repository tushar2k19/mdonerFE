<template>
  <header class="header">
    <img src="../assets/img/wadi_logo3.png" alt="Logo" class="main-logo">
    <div class="user-info">
      <span @click="toggleDropdown">{{ userName }}</span>
      <div v-if="dropdownVisible" class="dropdown">
        <ul>
          <li @click="signOut">Logout</li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  data () {
    return {
      userName: null,
      dropdownVisible: false
    }
  },
  methods: {
    toggleDropdown() {
      this.dropdownVisible = !this.dropdownVisible;
    },
    signOut () {
      this.$http.secured.delete('/signout')
        .then(response => {
          delete localStorage.signedIn
          delete localStorage.lastLocation
          this.$router.replace('/login')
          // window.location.reload()
        })
        .catch(error => {
          alert('signout_error -> ' + error)
        })
    },
    userInfo () {
      name = 'user_info'
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        let encodedValue = parts.pop().split(';').shift()
        console.log('inside', JSON.parse(decodeURIComponent(encodedValue)))
        return JSON.parse(decodeURIComponent(encodedValue)).username
      }
    }
  },
  created () {
    this.userName = this.userInfo().replace(/\+/g, ' ') || 'tmkoc'
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  position: relative;
}

.main-logo {
  height: 40px;
  width: 120px;
  margin-left: 50px;
  margin-top: -8px;
}

.user-info {
  position: relative;
  cursor: pointer;
}

.user-info span {
  font-weight: bold;
  color: #333;
  font-size: 16px;
}

.dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-top: 10px;
  width: 170px;
  z-index: 2;
}

.dropdown ul {
  list-style: none;
  padding: 10px;
  margin: 0;
}

.dropdown ul li {
  padding: 12px 10px;
  cursor: pointer;
  color: #333;
  border-radius: 5px;
  text-align: center;
  font-size: 14px;
}

.dropdown ul li:hover {
  background-color: #f1f1f1;
  color: #27ae60;
}

@media (max-width: 768px) {
  .header {
    padding: 10px;
  }

  .user-info span {
    font-size: 14px;
  }

  .dropdown {
    width: 120px;
  }
}
</style>
