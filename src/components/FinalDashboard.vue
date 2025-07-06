<template>
  <div class="dashboard-container">
    <!-- Top Actions - Right Aligned -->
    <div class="dashboard-actions">
      <button class="filter-btn">
        Filter
        <img src="../assets/img/filter1.png" alt="Filter" style="height: 16px;width: 14px;" />
      </button>
      <button @click="downloadPDF" class="download-pdf-btn">Download PDF</button>
    </div>

    <!-- Table Headers -->
    <div class="table-headers">
      <table>
        <tr>
          <th>S No.</th>
          <th>Sector/Division</th>
          <th>Description</th>
          <th>Action to be Taken</th>
          <th>Original Date</th>
          <th>Responsibility</th>
          <th>Review Date</th>
        </tr>
      </table>
    </div>

    <!-- Table Rows -->
    <div v-for="(task, index) in approvedTasks"
         :key="task.id"
         :data-task-id="task.id"
         class="table-row">
      <table>
        <tr>
          <td>{{ index + 1 }}</td>
          <td>{{ task.sector_division }}</td>
          <td>{{ task.description }}</td>
          <td v-html="processActionContent(task.action_to_be_taken)" class="action-content-cell"></td>
          <td>{{ formatDate(task.original_date) }}</td>
          <td>{{ task.responsibility }}</td>
          <td>{{ formatDate(task.review_date) }}</td>
        </tr>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="approvedTasks.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No Approved Tasks</h3>
      <p>No approved tasks found for the selected date.</p>
    </div>
  </div>
</template>

<script>
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default {
  name: 'FinalDashboard',

  data () {
    return {
      selectedDate: new Date(),
      approvedTasks: [],
      pdfVisible: false,
      resizeTimeout: null
    }
  },

  watch: {
    approvedTasks: {
      handler() {
        this.$nextTick(() => {
          this.applyAutoScaling()
        })
      },
      deep: true
    }
  },

  computed: {
    statusClass() {
      return {
        draft: 'status-draft',
        under_review: 'status-review', 
        final_review: 'status-final-review',
        approved: 'status-approved',
        completed: 'status-completed'
      }
    }
  },

  created () {
    this.fetchApprovedTasks()
  },

  mounted() {
    // Re-apply scaling on window resize
    window.addEventListener('resize', this.handleResize)
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },

  methods: {
    async fetchApprovedTasks() {
      try {
        const response = await this.$http.secured.get('/tasks/approved', {
          params: {
            date: this.selectedDate.toISOString().split('T')[0]
          }
        })
        
        // Sort tasks by review_date (earliest first)
        const sortTasksByReviewDate = (tasks) => {
          return tasks.sort((a, b) => {
            const dateA = new Date(a.review_date)
            const dateB = new Date(b.review_date)
            return dateA - dateB
          })
        }

        this.approvedTasks = sortTasksByReviewDate(response.data.tasks)
        
        // Apply auto-scaling after tasks are loaded
        this.$nextTick(() => {
          this.applyAutoScaling()
        })
      } catch (error) {
        console.error('Error fetching approved tasks:', error)
        this.approvedTasks = []
      }
    },

    applyAutoScaling() {
      // Wait for DOM to be fully rendered
      setTimeout(() => {
        const actionCells = document.querySelectorAll('.action-content-cell')
        
        actionCells.forEach(cell => {
          // Reset any previous scaling
          cell.style.fontSize = ''
          cell.style.lineHeight = ''
          cell.classList.remove('scaled', 'auto-scaled-small', 'auto-scaled-tiny')
          
          // Reset table scaling
          const tables = cell.querySelectorAll('table')
          tables.forEach(table => {
            table.style.fontSize = ''
            table.style.transform = 'none'
            table.classList.remove('scaled-table')
          })
          
          // Check if content overflows
          const isOverflowing = cell.scrollWidth > cell.clientWidth
          
          if (isOverflowing) {
            // Calculate overflow amount
            const overflowRatio = cell.scrollWidth / cell.clientWidth
            
            console.log(`Content overflow detected: ${overflowRatio.toFixed(2)}x`)
            
            // Apply tiered font-size reduction instead of transform scaling
            if (overflowRatio > 1.8) {
              // Severe overflow: smallest font size
              cell.classList.add('auto-scaled-tiny')
              console.log('Applied tiny scaling (severe overflow)')
            } else if (overflowRatio > 1.3) {
              // Moderate overflow: medium font size
              cell.classList.add('auto-scaled-small')
              console.log('Applied small scaling (moderate overflow)')
            } else {
              // Minor overflow: slight reduction
              cell.style.fontSize = '0.85em'
              cell.style.lineHeight = '1.3'
              console.log('Applied minor font reduction')
            }
            
            // Special handling for tables within action content
            tables.forEach(table => {
              // Check if table still overflows after cell font reduction
              setTimeout(() => {
                if (table.scrollWidth > cell.clientWidth * 0.95) {
                  const tableOverflow = table.scrollWidth / (cell.clientWidth * 0.95)
                  
                  if (tableOverflow > 1.5) {
                    table.style.fontSize = '0.65em'
                    table.classList.add('scaled-table')
                    console.log(`Applied table font reduction: 0.65em`)
                  } else if (tableOverflow > 1.2) {
                    table.style.fontSize = '0.75em'
                    table.classList.add('scaled-table')
                    console.log(`Applied table font reduction: 0.75em`)
                  }
                }
              }, 50)
            })
          }
        })
      }, 100)
    },

    handleResize() {
      // Debounce resize events
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = setTimeout(() => {
        this.applyAutoScaling()
      }, 250)
    },

    processActionContent(content) {
      if (!content) return ''
      
      // Create a temporary element to process the HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      
      // Process hierarchical lists similar to TentativeDashboard
      const processLists = (element, depth = 0) => {
        const lists = element.querySelectorAll('ul, ol')
        lists.forEach(list => {
          const items = list.querySelectorAll(':scope > li')
          let counter = 1
          
          items.forEach(li => {
            // Remove existing markers
            li.innerHTML = li.innerHTML.replace(/^(\s*)(•|\d+\.?)\s+/, '')
            
            const marker = document.createElement('span')
            marker.className = 'list-marker'
            marker.style.width = '20px'
            marker.style.display = 'inline-block'
            
            if (list.tagName === 'OL') {
              marker.textContent = `${counter}. `
              counter++
            } else {
              const bullets = ['•', '•', '•']
              marker.textContent = `${bullets[depth % 3]} `
            }
            
            li.insertBefore(marker, li.firstChild)
            if (li.querySelector('ul, ol')) processLists(li, depth + 1)
          })
        })
      }
      
      processLists(tempDiv)
      return tempDiv.innerHTML
    },

    async downloadPDF() {
      this.pdfVisible = true
      
      try {
        await this.$nextTick()
        
        const element = document.querySelector('.dashboard-container')
        if (!element) {
          throw new Error('Dashboard container not found')
        }
        
        // Clone the element for PDF generation
        const clonedElement = element.cloneNode(true)
        clonedElement.style.width = '1200px'
        clonedElement.style.backgroundColor = 'white'
        clonedElement.style.padding = '20px'
        
        // Hide action buttons and modify for PDF
        const actionElements = clonedElement.querySelectorAll('.dashboard-actions')
        actionElements.forEach(el => {
          el.style.display = 'none'
        })
        
        // Process PDF content
        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.left = '-9999px'
        iframe.style.width = '1200px'
        iframe.style.height = '800px'
        document.body.appendChild(iframe)
        
        const doc = iframe.contentDocument
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Final Dashboard</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .dashboard-container { max-width: 1200px; margin: 0 auto; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 11px; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .table-headers th { background-color: #4a90e2; color: white; }
              .status-approved { background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; }
              .action-content-cell { max-width: 300px; word-wrap: break-word; }
              .list-marker { font-weight: bold; margin-right: 5px; }
            </style>
          </head>
          <body class="pdf-capture-mode">
            <h1 style="text-align: center; color: #333; margin-bottom: 30px;">Final Dashboard - Approved Tasks</h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()}</p>
            ${clonedElement.outerHTML}
          </body>
          </html>
        `)
        doc.close()
        
        setTimeout(async () => {
          try {
            const canvas = await html2canvas(doc.body, {
              width: 1200,
              height: doc.body.scrollHeight,
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
            })
            
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const marginX = 10
            const usableWidth = pageWidth - (marginX * 2)
            
            let position = 20
            let renderedHeight = 0
            
            while (renderedHeight < canvas.height) {
              const sliceHeightPx = Math.min(canvas.height - renderedHeight, (pageHeight - 40) * canvas.width / usableWidth)
              
              const sliceCanvas = document.createElement('canvas')
              sliceCanvas.width = canvas.width
              sliceCanvas.height = sliceHeightPx
              const sliceCtx = sliceCanvas.getContext('2d')
              sliceCtx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)
              
              const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 1.0)
              const sliceImgHeight = (sliceHeightPx * usableWidth) / canvas.width
              
              pdf.addImage(sliceImgData, 'JPEG', marginX, position, usableWidth + 1, sliceImgHeight)
              
              renderedHeight += sliceHeightPx
              
              if (renderedHeight < canvas.height) {
                pdf.addPage()
                position = 20
              }
            }
            
            pdf.save('final-dashboard.pdf')
            document.body.removeChild(iframe)
          } catch (error) {
            console.error('PDF generation failed:', error)
            document.body.removeChild(iframe)
          }
        }, 1000)
        
      } catch (error) {
        console.error('PDF generation failed:', error)
      } finally {
        this.pdfVisible = false
      }
    },

    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },

    formatStatus(status) {
      const statusMap = {
        draft: 'Draft',
        under_review: 'Under Review', 
        final_review: 'Final Review',
        approved: 'Approved',
        completed: 'Completed'
      }
      return statusMap[status] || status
    }
  }
}
</script>

<style scoped>
/* Government Website Inspired Styling - Full Width like TentativeDashboard */
.dashboard-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #f8f9fa;
  min-height: 100vh;
  color: #212529;
  padding: 1.5rem;
  min-height: calc(100vh - 4rem);
}

/* Compact Right-Aligned Actions */
.dashboard-actions {
  display: flex;
  justify-content: flex-end; /* Changed from flex-start to flex-end */
  align-items: center;
  gap: 0.75rem; /* Reduced gap */
  margin-bottom: 1.5rem;
  /* Removed card styling - no background, padding, shadow, border */
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px; /* Reduced gap */
  padding: 0.5rem 1rem; /* Reduced padding */
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem; /* Reduced font size */
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
}

.filter-btn:hover {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);
}

.download-pdf-btn {
  padding: 0.5rem 1rem; /* Reduced padding */
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem; /* Reduced font size */
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}

.download-pdf-btn:hover {
  background: linear-gradient(135deg, #047857 0%, #059669 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
}

/* Compact Government Style Table Headers */
.table-headers {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  margin-bottom: 0.5rem;
  border-radius: 8px 8px 0 0;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  overflow: hidden; /* Prevent any overflow */
}

.table-headers table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  margin: 0; /* Remove any margin */
}

.table-headers th {
  color: white;
  font-size: 0.65rem; /* Reduced from 0.875rem */
  font-weight: 600;
  text-align: left;
  padding: 0.75rem; /* Reduced from 1rem */
  white-space: normal;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  line-height: 1.3; /* Compact line height */
}

.table-headers th:last-child {
  border-right: none;
}

.table-row {
  background: white;
  border-radius: 0;
  margin: 0.5rem 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e9ecef;
  overflow: hidden; /* Prevent overflow */
}

.table-row:last-child {
  border-radius: 0 0 8px 8px;
}

.table-row table {
  width: 100%;
  margin: 0; /* Remove margin that was causing overflow */
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.table-row td {
  padding: 0.75rem; /* Reduced from 1rem */
  color: #495057;
  font-size: 0.8rem; /* Reduced from 0.875rem */
  vertical-align: middle;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  border-right: 1px solid #f8f9fa;
  background: white;
  overflow: hidden; /* Prevent cell overflow */
}

.table-row td:last-child {
  border-right: none;
}

/* Adjusted Column widths to total exactly 100% */
.table-headers th:nth-child(1),
.table-row td:nth-child(1) { 
  width: 5%; 
  min-width: 50px; /* Reduced min-width */
}

.table-headers th:nth-child(2),
.table-row td:nth-child(2) { 
  width: 10%; 
  min-width: 100px; /* Reduced min-width */
}

.table-headers th:nth-child(3),
.table-row td:nth-child(3) { 
  width: 12%; 
  min-width: 120px; /* Reduced min-width */
}

.table-headers th:nth-child(4),
.table-row td:nth-child(4) { 
  width: 55%; 
  min-width: 400px; /* Reduced min-width */
  overflow: hidden !important; /* Changed from visible to hidden */
  word-wrap: break-word;
  white-space: normal;
  text-align: left !important;
}

.table-headers th:nth-child(5),
.table-row td:nth-child(5) { 
  width: 6%; 
  min-width: 70px; /* Reduced min-width */
}

.table-headers th:nth-child(6),
.table-row td:nth-child(6) { 
  width: 8%; 
  min-width: 90px; /* Reduced min-width */
}

.table-headers th:nth-child(7),
.table-row td:nth-child(7) { 
  width: 4%; 
  min-width: 50px; /* Reduced min-width */
}

/* Action Content Styling - More Compact with Auto-scaling */
.action-content-cell {
  text-align: left !important;
  vertical-align: top !important;
  padding: 0.75rem !important; /* Reduced padding */
  overflow: hidden !important; /* Prevent horizontal overflow */
  word-wrap: break-word;
  line-height: 1.4;
  max-width: 100% !important; /* Ensure it doesn't exceed container */
  position: relative;
  box-sizing: border-box;
  /* Smooth transition for scaling */
  transition: transform 0.3s ease;
}

.action-content-cell ul, .action-content-cell ol {
  margin: 6px 0; /* Reduced margin */
  padding-left: 0;
  list-style: none;
}

.action-content-cell li {
  margin: 3px 0; /* Reduced margin */
  list-style: none;
  display: flex;
  align-items: flex-start;
  line-height: 1.3; /* More compact line height */
}

.action-content-cell .list-marker {
  font-weight: 600;
  margin-right: 6px; /* Reduced margin */
  min-width: 18px; /* Reduced width */
  color: #1e40af;
  flex-shrink: 0;
}

/* More compact table styling within action content */
.action-content-cell table {
  width: 100% !important;
  max-width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.4rem 0 !important; /* Reduced margin */
  font-size: 0.75rem !important; /* Reduced font size */
  table-layout: auto !important;
  overflow-wrap: break-word !important;
  /* Smooth transition for table scaling */
  transition: transform 0.3s ease;
  transform-origin: top left;
}

.action-content-cell table th,
.action-content-cell table td {
  border: 1px solid #d1d5db !important;
  padding: 4px 6px !important; /* Reduced padding */
  text-align: left !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  font-size: 0.7rem !important; /* Reduced font size */
}

.action-content-cell table th {
  background-color: #f3f4f6 !important;
  font-weight: 600 !important;
  font-size: 0.7rem !important; /* Reduced font size */
}

.action-content-cell table td {
  font-size: 0.7rem !important; /* Reduced font size */
}

/* 🎯 UNIFIED: Clean Action Node Hierarchical Styling with DEEP SELECTORS */
.action-content-cell /deep/ .action-node {
  display: flex !important;
  align-items: flex-start !important;
  margin: 3px 0 !important; /* Reduced margin */
  padding: 2px 0 !important; /* Reduced padding */
  line-height: 1.4 !important;
  font-size: inherit !important;
}

.action-content-cell /deep/ .action-node .node-marker {
  flex-shrink: 0 !important;
  margin-right: 8px !important;
  font-weight: bold !important;
  min-width: 24px !important;
  text-align: left !important;
}

.action-content-cell /deep/ .action-node .node-content {
  flex: 1 !important;
  word-break: break-word !important;
  color: #000 !important;
}

/* 📐 ENHANCED: Hierarchical indentation with deep selectors */
.action-content-cell /deep/ .action-node.level-1 { 
  margin-left: 0 !important; 
  background-color: rgba(59, 130, 246, 0.02) !important;
}
.action-content-cell /deep/ .action-node.level-2 { 
  margin-left: 40px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  padding-left: 8px !important;
}
.action-content-cell /deep/ .action-node.level-3 { 
  margin-left: 80px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  padding-left: 8px !important;
}
.action-content-cell /deep/ .action-node.level-4 { 
  margin-left: 120px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  padding-left: 8px !important;
}
.action-content-cell /deep/ .action-node.level-5 { 
  margin-left: 160px !important; 
  /* background-color: rgba(239, 68, 68, 0.02) !important; */
  padding-left: 8px !important;
}

/* 🎨 UNIFIED: List style colors with deep selectors */
.action-content-cell /deep/ .action-node.style-decimal .node-marker { 
  /* color: #1e40af !important; */
  font-weight: bold !important; 
}
.action-content-cell /deep/ .action-node.style-lower-alpha .node-marker { 
  /* color: #059669 !important; */
  font-weight: bold !important; 
}
.action-content-cell /deep/ .action-node.style-lower-roman .node-marker { 
  /* color: #7C3AED !important; */
  font-weight: bold !important; 
}
.action-content-cell /deep/ .action-node.style-bullet .node-marker { 
  /* color: #DC2626 !important; */
  font-weight: bold !important; 
}

/* 📅 Review date styling - yellow highlight with deep selectors */
.action-content-cell /deep/ .action-node .node-content .review-date {
  font-size: 0.85em !important;
  color: #333 !important;
  font-weight: 500 !important;
  margin-left: 8px !important;
  background-color: #ffeb3b !important; /* Yellow highlight background */
  padding: 2px 6px !important;
  border-radius: 4px !important;
  border: none !important;
  display: inline-block !important;
}

/* Today's date styling - red text on yellow background */
.action-content-cell /deep/ .action-node .node-content .review-date.today {
  color: #d32f2f !important; /* Red text for today's date */
  font-weight: 600 !important;
}

/* ✅ Completed nodes styling with DEEP SELECTORS - GREEN COLOR */
.action-content-cell /deep/ .action-node.completed { 
  /* background-color: rgba(16, 185, 129, 0.1) !important; */
  /* border-left: 3px solid #10b981 !important; Green left border */
  border-radius: 4px !important;
  padding: 4px 8px !important;
}
.action-content-cell /deep/ .action-node.completed .node-content { 
  color: #059669 !important; /* Green text color */
  font-weight: 500 !important; /* Slightly bold */
}
.action-content-cell /deep/ .action-node.completed .node-marker { 
  color: #10b981 !important; /* Green marker color */
  font-weight: 600 !important;
}

/* 🔧 FALLBACK: Alternative deep selector syntaxes for maximum compatibility */
.action-content-cell >>> .action-node.level-2 { 
  margin-left: 40px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 8px !important;
}
.action-content-cell >>> .action-node.level-3 { 
  margin-left: 80px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 8px !important;
}
.action-content-cell >>> .action-node.level-4 { 
  margin-left: 120px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 8px !important;
}
.action-content-cell >>> .action-node.level-5 { 
  margin-left: 160px !important; 
  /* background-color: rgba(239, 68, 68, 0.02) !important; */
  /* border-left: 2px solid rgba(239, 68, 68, 0.3) !important; */
  padding-left: 8px !important;
}

/* Scaled content adjustments */
.action-content-cell.scaled {
  overflow: visible !important;
}

.action-content-cell.scaled table {
  margin-bottom: 0.2rem !important;
}

/* Ensure scaled tables don't interfere with layout */
.action-content-cell table.scaled-table {
  display: block;
  width: fit-content !important;
  max-width: none !important;
}

/* Government Style Status Badges */
.status-draft {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-review {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-final-review {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-approved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-completed {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Government Style Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 0 0 8px 8px;
  color: #6c757d;
  border: 1px solid #e9ecef;
  border-top: none;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
  color: #6c757d;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem; /* Adjusted for mobile */
  }
  
  .dashboard-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    /* No padding since we removed the card styling */
  }
  
  .filter-btn,
  .download-pdf-btn {
    justify-content: center;
    padding: 0.6rem 1rem; /* Slightly larger on mobile for touch */
    font-size: 0.85rem;
  }
  
  .table-headers th,
  .table-row td {
    padding: 0.5rem;
    font-size: 0.75rem;
  }
  
  .action-content-cell {
    padding: 0.5rem !important;
    font-size: 0.75rem !important;
  }
  
  .action-content-cell table th,
  .action-content-cell table td {
    padding: 3px 4px !important;
    font-size: 0.65rem !important;
  }
}

/* PDF-specific styles */
@media print {
  .dashboard-actions {
    display: none !important;
  }
  
  .table-headers,
  .table-row {
    box-shadow: none;
    border: 1px solid #ddd;
  }
}

/* ✅ NEW: Font-size based auto-scaling classes - NO MORE TRANSFORM SCALING */
/* Small font reduction for moderate overflow */
.action-content-cell.auto-scaled-small {
  font-size: 0.8em !important;
  line-height: 1.25 !important;
}

/* Tiny font reduction for severe overflow */
.action-content-cell.auto-scaled-tiny {
  font-size: 0.7em !important;
  line-height: 1.2 !important;
}

/* Ensure auto-scaled content maintains proper spacing */
.action-content-cell.auto-scaled-small /deep/ .action-node,
.action-content-cell.auto-scaled-tiny /deep/ .action-node {
  margin: 2px 0 !important;
  padding: 1px 0 !important;
}

/* Auto-scaled table improvements */
.action-content-cell.auto-scaled-small /deep/ table,
.action-content-cell.auto-scaled-tiny /deep/ table {
  margin: 0.2rem 0 !important;
}

.action-content-cell.auto-scaled-small /deep/ table th,
.action-content-cell.auto-scaled-small /deep/ table td,
.action-content-cell.auto-scaled-tiny /deep/ table th,
.action-content-cell.auto-scaled-tiny /deep/ table td {
  padding: 3px 4px !important;
}

/* Table-specific font scaling with deep selectors */
.action-content-cell /deep/ table.scaled-table {
  transform: none !important; /* Remove any transform scaling */
}

/* Ensure minimum cell width is always maintained */
.table-row td:nth-child(4) {
  min-width: 400px !important; /* Force minimum width for action column */
  width: 55% !important;
  max-width: none !important;
}
</style>
