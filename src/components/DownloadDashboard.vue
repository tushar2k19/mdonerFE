// Create a new file: DownloadDashboard.vue
<template>
  <div id="pdf-dashboard" :style="{ display: visible ? 'block' : 'none' }">
    <div class="pdf-header">
      <h2>DASHBOARD MEETING POINTS (MDoNER)</h2>
      <p class="date-display">As on {{ formattedCurrentDate }}</p>
    </div>

    <table class="pdf-table">
      <thead>
      <tr>
        <th>SN</th>
        <th>Sector / Division</th>
        <th>Description</th>
        <th>Action to be Taken</th>
        <th>Original Date</th>
        <th>Responsibility</th>
        <th>Review Date</th>
      </tr>
      </thead>
    </table>

    <!-- Each row will be captured separately -->
    <div v-for="(task, index) in tasks" :key="task.id" :id="`pdf-row-${task.id}`" class="pdf-row">
      <table class="pdf-table">
        <tr>
          <td class="sn-col">{{ index + 1 }}</td>
          <td class="sector-col">{{ task.sector_division }}</td>
          <td class="desc-col">{{ task.description }}</td>
          <td class="action-col" v-html="task.action_to_be_taken"></td>
          <td class="date-col">{{ formatDate(task.original_date) }}</td>
          <td class="resp-col">{{ task.responsibility }}</td>
          <td class="review-col">{{ formatDate(task.review_date) }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DownloadDashboard',
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
    formattedCurrentDate() {
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

<style>
#pdf-dashboard {
  position: absolute;
  left: -9999px;
  background: white;
  padding: 20px;
  font-family: Arial, sans-serif;
  width: 210mm; /* A4 width */
}

.pdf-header {
  position: relative;
  margin-bottom: 20px;
}

.pdf-header h2 {
  text-align: center;
  font-size: 16px;
  margin: 0;
  color: #000;
}

.date-display {
  position: absolute;
  right: 0;
  top: 0;
  margin: 0;
  font-size: 12px;
}

.pdf-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pdf-table th,
.pdf-table td {
  border: 1px solid #000;
  padding: 6px;
  text-align: left;
  font-size: 11px;
  vertical-align: top;
}

.pdf-table th {
  background-color: #4472C4; /* Blue header background */
  color: white;
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

/* Styling for nested tables inside action_to_be_taken */
.action-col table {
  width: 100%;
  border-collapse: collapse;
  margin: 5px 0;
}

.action-col table th,
.action-col table td {
  border: 1px solid #000;
  padding: 3px;
  font-size: 9px;
}

.pdf-row {
  page-break-inside: avoid;
  margin-bottom: 5px;
}
</style>
