// PDFTemplate.vue
<template>
  <div id="pdf-template" :style="{ display: visible ? 'block' : 'none', width: '210mm' }">
    <div class="pdf-header">
      <h2>DASHBOARD MEETING POINTS (MDoNER)</h2>
      <p class="date-display">As on {{ currentDate }}</p>
    </div>
    <table class="pdf-table">
      <thead>
      <tr>
        <th class="sn-col">SN</th>
        <th class="sector-col">Sector / Division</th>
        <th class="desc-col">Description</th>
        <th class="action-col">Action to be Taken</th>
        <th class="date-col">Original Date</th>
        <th class="resp-col">Responsibility</th>
        <th class="review-col">Review Date</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(task, index) in tasks" :key="task.id">
        <td class="sn-col">{{ index + 1 }}</td>
        <td class="sector-col">{{ task.sector_division }}</td>
        <td class="desc-col">{{ task.description }}</td>
        <td class="action-col" v-html="task.action_to_be_taken"></td>
        <td class="date-col">{{ formatDate(task.original_date) }}</td>
        <td class="resp-col">{{ task.responsibility }}</td>
        <td class="review-col">{{ formatDate(task.review_date) }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  props: {
    tasks: {
      type: Array,
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    currentDate() {
      const now = new Date();
      return now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  },
  methods: {
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }
}
</script>

<style scoped>
#pdf-template {
  position: absolute;
  left: -9999px;
  font-family: Arial, sans-serif;
  background: white;
  padding: 20px;
}

.pdf-header {
  text-align: center;
  margin-bottom: 15px;
  position: relative;
}

.pdf-header h2 {
  margin-bottom: 5px;
  font-size: 16px;
  text-align: center;
}

.date-display {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 12px;
}

.pdf-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pdf-table th, .pdf-table td {
  border: 1px solid #000;
  padding: 5px;
  text-align: left;
  font-size: 10px;
  overflow-wrap: break-word;
}

.pdf-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

/* Column widths */
.sn-col { width: 5%; }
.sector-col { width: 12%; }
.desc-col { width: 15%; }
.action-col { width: 35%; }
.date-col { width: 10%; }
.resp-col { width: 13%; }
.review-col { width: 10%; }

/* Styling for tables inside action_to_be_taken column */
.action-col table {
  width: 100%;
  border-collapse: collapse;
  margin: 5px 0;
}

.action-col table th,
.action-col table td {
  border: 1px solid #000;
  padding: 2px;
  font-size: 9px;
}

/* Highlight styling */
.action-col span[style*="background-color: yellow"] {
  background-color: yellow !important;
  padding: 0 2px;
}

.action-col span[style*="color: red"] {
  color: red !important;
  font-weight: bold;
}
</style>
