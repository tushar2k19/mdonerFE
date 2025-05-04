<template>
  <canvas ref="canvas" class="particle-canvas"></canvas>
</template>

<script>
export default {
  name: 'ParticleBackground',
  data() {
    return {
      canvas: null,
      ctx: null,
      particles: [],
      mouse: {
        x: null,
        y: null,
        radius: 150
      }
    }
  },
  mounted() {
    this.initCanvas()
    this.animate()
    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    initCanvas() {
      this.canvas = this.$refs.canvas
      this.ctx = this.canvas.getContext('2d')
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight

      // Create particles
      this.createParticles()
    },

    createParticles() {
      this.particles = []
      const numberOfParticles = (this.canvas.width * this.canvas.height) / 5000

      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 5 + 1
        const x = Math.random() * (this.canvas.width - size * 2)
        const y = Math.random() * (this.canvas.height - size * 2)
        const directionX = Math.random() * 2 - 1
        const directionY = Math.random() * 2 - 1
        const color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`

        this.particles.push({
          x,
          y,
          directionX,
          directionY,
          size,
          color
        })
      }
    },

    animate() {
      requestAnimationFrame(this.animate)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      for (const particle of this.particles) {
        particle.x += particle.directionX
        particle.y += particle.directionY

        // Check if particle is still within canvas
        if (particle.x > this.canvas.width || particle.x < 0) {
          particle.directionX *= -1
        }
        if (particle.y > this.canvas.height || particle.y < 0) {
          particle.directionY *= -1
        }

        // Check mouse collision
        if (this.mouse.x && this.mouse.y) {
          const dx = this.mouse.x - particle.x
          const dy = this.mouse.y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < this.mouse.radius) {
            const forceDirectionX = dx / distance
            const forceDirectionY = dy / distance
            const force = (this.mouse.radius - distance) / this.mouse.radius

            particle.x -= forceDirectionX * force * 5
            particle.y -= forceDirectionY * force * 5
          }
        }

        // Draw particle
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        this.ctx.fillStyle = particle.color
        this.ctx.fill()

        // Connect nearby particles
        this.connectParticles(particle)
      }
    },

    connectParticles(particle1) {
      for (const particle2 of this.particles) {
        const dx = particle1.x - particle2.x
        const dy = particle1.y - particle2.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          this.ctx.beginPath()
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 - distance/500})`
          this.ctx.lineWidth = 0.5
          this.ctx.moveTo(particle1.x, particle1.y)
          this.ctx.lineTo(particle2.x, particle2.y)
          this.ctx.stroke()
        }
      }
    },

    handleMouseMove(event) {
      this.mouse.x = event.x
      this.mouse.y = event.y
    },

    handleResize() {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      this.createParticles()
    }
  }
}
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
</style>
