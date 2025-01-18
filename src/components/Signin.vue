<template>
  <div class="login-page">
    <div class="login-box">
      <h2>Login</h2>
      <form @submit.prevent="signin">
        <div class = "error-card" v-if="error"> {{ error }}</div>
        <div class="input-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" placeholder="abc@xyz.com" @input="clearError" required>
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" placeholder="********" @input="clearError" required>
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  </div>
</template>

<script>
// import {mapActions} from "vuex";
import CryptoJS from 'crypto-js'
import Cookies from 'js-cookie'

export default {
  name: 'Signin',
  data () {
    return {
      email: '',
      password: '',
      error: '',
      ENCRYPTION_KEY: 'f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6'
    }
  },
  created: function () {
    this.checkSignedin()
  },
  updated () {
    this.checkSignedin()
  },
  methods: {
    clearError () {
      this.error = ''
    },
    // checkSignedin: function () {
    //   if (localStorage.signedIn) {
    //     this.$router.replace('/dashboard')
    //   }
    // },
    signin () {
      this.$http.plain.post('/signin', {
        email: this.email,
        password: this.password
      })
        .then((response) => {
          if (response.data.success) {
            const encryptedData = response.data.data
            const decryptedData = this.decryptResponse(encryptedData)

            if (decryptedData) {
              this.signinSuccessful(response, decryptedData)
            }
          }
        })
        .catch(error => {
          console.error('Login failed:', error)
          this.signinFailed(error)
        })
    },

    decryptResponse (encryptedData) {
      try {
        const key = CryptoJS.enc.Utf8.parse(this.ENCRYPTION_KEY)
        const rawData = CryptoJS.enc.Base64.parse(encryptedData)
        const iv = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 4))
        const encrypted = CryptoJS.lib.WordArray.create(rawData.words.slice(4))
        const decrypted = CryptoJS.AES.decrypt(
          { ciphertext: encrypted },
          key,
          {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          }
        )
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8)
        return JSON.parse(decryptedStr)
      } catch (error) {
        console.error('Decryption failed:', error)
        return null
      }
    },
    signinSuccessful (response, decryptedData) {
      if (!response) {
        this.signinFailed(response)
        return
      }
      // eslint-disable-next-line camelcase
      const { user_info, csrf_token } = decryptedData
      Cookies.set('user_info', user_info, {
        // expires: 1, // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
      Cookies.set('csrf_token', csrf_token, {
        // expires: 1, // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
      localStorage.signedIn = true
      this.error = ''
      this.$router.replace('/dashboard')
    },
    signinFailed: function (error) {
      alert(`There was an error logging you in. Please try again or contain admin\n\n आपका लॉगिन नहीं हो पा रहा है. कृपया पुनः प्रयास करें या व्यवस्थापक से संपर्क करें`)
      this.error = (error.response && error.response.data && error.response.data.error) || ''
      this.password = ''
      this.email = ''
      delete localStorage.signedIn
    }
  }
}
</script>

<style scoped>
.login-page {
  background-image: url("../assets/download.png"); /* Replace with your image */
  background-size: cover;
  background-position: center;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-box {
  background-color: white;
  padding: 30px;
  border-radius: 5px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

.error-card {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.input-group {
  margin-bottom: 15px;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
}

.input-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #2ecc71;
}
</style>
