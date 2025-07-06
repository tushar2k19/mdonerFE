<template>
  <div class="dashboard-container">
    <!-- Top Actions -->
    <div class="dashboard-actions">
      <button class="filter-btn">
        Filter
        <img src="../assets/img/filter1.png" alt="Filter" style="height: 20px;width: 18px;" />
      </button>
      <button @click="openAddTaskModal" class="create-task-btn">Create task</button>
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
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </table>
    </div>

    <!-- Table Rows -->
    <div v-for="(task, index) in activeTasks"
         :key="task.id"
         :data-task-id="task.id"
         class="table-row"
         :class="{ 'highlighted-row': String(task.id) === String($route.query.highlightTaskId) }">
      <table>
        <tr>
          <td>{{ index + 1 }}</td>
          <td>{{ task.sector_division }}</td>
          <td>{{ task.description }}</td>
          <td v-html="task.action_to_be_taken" class="action-content-cell" 
              @click="debugContent(task)"></td>
          <td>{{ formatDate(task.original_date) }}</td>
          <td>{{ task.responsibility }}</td>
          <td>{{ formatDate(task.review_date) }}</td>
          <td><span :class="statusClass[task.status || 'unknown']">{{ formatStatus(task.status) }}</span></td>
          <td class="actions-cell">
            <div class="action-menu-container">
              <button class="action-trigger"
                      :class="{ 'active': activeMenuId === task.id }"
                      @mouseenter="showActionMenu(task.id, $event)"
                      @mouseleave="hideActionMenu(task.id)"
                      :data-task-id="task.id">
                ⋮
              </button>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Global Action Menu (outside table structure) -->
    <div class="global-action-menu" 
         :class="{ 'show': activeMenuId }"
         :style="menuPosition"
         @mouseenter="keepMenuOpen"
         @mouseleave="hideActionMenu(activeMenuId)">
      <button @click="editTask(getCurrentTask()); forceHideMenu()" class="menu-item">Edit</button>
      <button v-if="canDelete(getCurrentTask())"
              @click="deleteTask(activeMenuId); forceHideMenu()"
              class="menu-item">Delete</button>
      <button v-if="canSendForReview(getCurrentTask())"
              @click="openReviewModal(getCurrentTask()); forceHideMenu()"
              class="menu-item">{{ getReviewButtonText(getCurrentTask()) }}</button>
      <button @click="openCommentsModal(getCurrentTask()); forceHideMenu()"
              class="menu-item">Comments</button>
      <button v-if="canApprove(getCurrentTask())"
              @click="approveTask(getCurrentTask()); forceHideMenu()"
              class="menu-item">Approve</button>
    </div>

    <!-- Modals remain unchanged -->
    <TaskModal v-if="showTaskModal"
               :task="currentTask"
               :mode="taskModalMode"
               @close="closeTaskModal"
               @save="handleTaskSaved" />
    <ReviewModal v-if="showReviewModal"
                 :task="currentTask"
                 @close="closeReviewModal"
                 @send="sendForReview" />
    <CommentsModal v-if="showCommentsModal"
                   :task="currentTask"
                   @close="closeCommentsModal" />
  </div>
</template>

<script>
import TaskModal from '../components/TaskModal.vue'
import ReviewModal from '../components/ReviewModal.vue'
import CommentsModal from '../components/CommentsModal.vue'
import Datepicker from 'vuejs-datepicker'
// import ParticleBackground from './ParticleBackground.vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'


export default {
  name: 'TentativeDashboard',

  components: {
    TaskModal,
    ReviewModal,
    CommentsModal,
    Datepicker,
    // ParticleBackground,
  },

  data () {
    return {
      selectedDate: new Date(),
      activeTasks: [],
      currentTask: null,
      completedTasks: [],
      showTaskModal: false,
      showReviewModal: false,
      showCommentsModal: false,
      taskModalMode: 'add',
      showCompletedTasks: false,
      activeMenuId: null,
      menuPosition: { top: '0px', left: '0px' },
      pdfVisible: false,
      resizeTimeout: null,
      menuHideTimeout: null
    }
  },
  watch: {
    '$route.query.highlightTaskId'(newVal) {
      if (!newVal) {
        const highlightedRow = document.querySelector('.highlight-transition')
        if (highlightedRow) {
          highlightedRow.classList.remove('highlighted-row', 'highlight-transition')
        }
      }
    },
    activeTasks: {
      handler() {
        this.$nextTick(() => {
          this.applyAutoScaling()
        })
      },
      deep: true
    }
  },
  computed: {
    userRole () {
      let abc = this.getCookie('user_info')
      if (abc) {
        return JSON.parse(abc).role.toLowerCase()
      }
    },
    statusClass() {
      return {
        draft: 'status-draft',
        under_review: 'status-review',
        final_review: 'status-final-review',
        approved: 'status-approved',
        completed: 'status-completed',
        unknown: 'status-unknown'
      }
    }
  },

  created () {
    console.log('Route Query:', this.$route.query)
    this.fetchTasksByDate()
  },

  mounted() {
    // Re-apply scaling on window resize
    window.addEventListener('resize', this.handleResize)
    
    // Add click outside handler to close menu
    document.addEventListener('click', this.handleClickOutside)
    
    if (this.$route.query.highlightTaskId) {
      const row = document.querySelector(`tr[data-task-id="${this.$route.query.highlightTaskId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        row.classList.add('highlight-transition')
      }
    }
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('click', this.handleClickOutside)
    
    // Clear any pending timeouts
    if (this.menuHideTimeout) {
      clearTimeout(this.menuHideTimeout)
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout)
    }
  },

  methods: {
    handleResize() {
      // Debounce resize events
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        this.applyAutoScaling()
      }, 150)
    },

    toggleExpand (taskId) {
      this.$set(this.expandedRows, taskId, !this.expandedRows[taskId])
      console.log(this.expandedRows)
    },
    getCookie (name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        let encodedValue = parts.pop().split(';').shift()
        return decodeURIComponent(encodedValue)
      }
    },
    async fetchTasksByDate() {
      try {
        const response = await this.$http.secured.get('/tasks', {
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

        this.activeTasks = sortTasksByReviewDate(response.data.active)
        this.completedTasks = sortTasksByReviewDate(response.data.completed)
        
        // Debug: Check for tasks without status
        this.activeTasks.forEach((task, index) => {
          if (!task || !task.status) {
            console.warn(`Task at index ${index} has no status:`, task);
          }
        });
        
        // Apply auto-scaling after tasks are loaded
        this.$nextTick(() => {
          this.applyAutoScaling()
        })
      } catch (error) {
        console.error('Error fetching tasks:', error)
      }
    },

    applyAutoScaling() {
      // ⚠️ TEMPORARILY DISABLED - Testing if auto-scaling interferes with hierarchical display
      console.log('Auto-scaling temporarily disabled for testing')
      
      // Wait for DOM to be fully rendered (unreachable code commented out)
      /*
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
      */
    },

    debugContent(task) {
      console.log('🔍 Debug Content for Task:', task.id)
      console.log('Raw HTML:', task.action_to_be_taken)
      
      // Parse the HTML to analyze structure
      if (task.action_to_be_taken) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(task.action_to_be_taken, 'text/html')
        const actionNodes = doc.querySelectorAll('.action-node')
        
        console.log(`Found ${actionNodes.length} action nodes:`)
        actionNodes.forEach((node, index) => {
          const markerEl = node.querySelector('.node-marker')
          const contentEl = node.querySelector('.node-content')
          const marker = markerEl ? markerEl.textContent : 'No marker'
          const content = contentEl ? contentEl.textContent : 'No content'
          const classes = node.className
          console.log(`  ${index + 1}. Marker: "${marker}", Content: "${content}", Classes: "${classes}"`)
        })
      }
    },

    openAddTaskModal () {
      this.currentTask = null
      this.taskModalMode = 'add'
      this.showTaskModal = true
    },
    getMarker(number, style) {
      if (style === 'lower-alpha') return String.fromCharCode(96 + number);
      if (style === 'lower-roman') return this.toRoman(number);
      return number;
    },

    toRoman(num) {
      const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
      return roman[num - 1] || num;
    },
    async downloadPDF() {
      try {
        const orientation = 'l';
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginX = 5;
        const marginY = 10;
        const usableWidth = pageWidth - marginX * 2;
        let position = marginY;

        pdf.setFontSize(12);
        pdf.setFont('Arial', 'bold');

        const headerText = 'DASHBOARD MEETING POINTS (MDoNER)';
        const headerWidth = pdf.getTextWidth(headerText);
        pdf.setFillColor(255, 255, 0);
        pdf.rect(104, 6, headerWidth + 1.25, 6, 'F');
        pdf.text(headerText, pageWidth / 2, marginY, { align: 'center' });

        // Date header
        const today = new Date();
        const options = { timeZone: 'Asia/Kolkata' };
        const formattedDate = today.toLocaleDateString('en-IN', options)
          .replace(/\//g, '.')
          .replace(/\b(\d)\b/g, '0$1');
        pdf.setFillColor(255, 255, 0);
        pdf.rect(pageWidth - marginX - 30.2, marginY - 4.5, 30.2, 6, 'F');
        pdf.text(`As on ${formattedDate}`, pageWidth - marginX, marginY, { align: 'right' });

        // position += 18;
        position += 1;

        // --- Custom Table Headers ---
        const columnWidths = [2.5, 6.5, 8, 65, 7.2, 5.8, 5] // Percentage widths
        const headers = [
          'S No.',
          'Sector/Division',
          'Description',
          'Action to be Taken',
          'Original Date',
          'Responsibility',
          'Review Date'
        ];

        // Convert percentages to mm based on usable width
        const mmWidths = columnWidths.map(w => (usableWidth * w) / 100);
        // In the tableBorderStyle section replace with:
        const tableBorderStyle = `
  .pdf-capture-mode table {
    border-collapse: collapse !important;
    border: 1px solid #ddd !important;
  }
  .pdf-capture-mode th,
  .pdf-capture-mode td:not(:nth-child(4)) {
    border: 1px solid #ddd !important;
    padding: 1.5px 2px !important;
  }
  /* Explicitly reset styles for column 4 and its nested elements */
  .pdf-capture-mode td:nth-child(4),
  .pdf-capture-mode td:nth-child(4) * {
    border: none !important;
    background: none !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .pdf-capture-mode td:nth-child(4) table {
    border: none !important;
    background: transparent !important;
  }
  .pdf-capture-mode td:nth-child(4) td {
    border: none !important;
    padding: 2px 0 !important;
  }
`;
        let xPosition = marginX;

        pdf.setFontSize(7.5);
        pdf.setFont('Arial', 'bold');

        headers.forEach((header, index) => {
          const cellWidth = mmWidths[index];
          const textWidth = pdf.getTextWidth(header);

          // Add 5px (1.75mm) margin on both sides
          const paddedWidth = cellWidth + 1.5;
          const xStart = xPosition - 0.25;

          pdf.setFillColor(59, 130, 246);
          pdf.rect(xStart, position, paddedWidth, 8, 'F');
          pdf.text(
            header,
            xPosition + (cellWidth - textWidth) / 2,
            position + 5.5
          );

          xPosition += cellWidth;
        });

        position += 8;


        // --- Process Rows ---
        const rows = document.querySelectorAll('.table-row');
        if (!rows.length) return;

        for (let i = 0; i < rows.length; i++) {
          const rowClone = rows[i].cloneNode(true);
          const style = document.createElement('style');
          style.textContent = tableBorderStyle;
          rowClone.appendChild(style);

          const tableInRow = rowClone.querySelector('table');

          rowClone.style.margin = '0';
          rowClone.style.padding = '0';
          tableInRow.style.margin = '0';
          tableInRow.style.padding = '0';

          [9].forEach(n => {
            const cell = tableInRow.querySelector(`tr td:nth-child(${n})`);
            if (cell) cell.remove()
          });
          [8].forEach(n => {
            const cell = tableInRow.querySelector(`tr td:nth-child(${n})`);
            if (cell) cell.remove()
          });

          [5, 6, 7].forEach(colIndex => {
            const tds = tableInRow.querySelectorAll(`tr > td:nth-child(${colIndex}):not(table table td)`);
            tds.forEach(td => {
              // Wrap content in styled span
              td.innerHTML = `<span style="
              background-color: yellow !important;
              font-weight: bold !important;
              padding: 1px 3px !important;
              border-radius: 2px !important;
              display: inline-block !important;
              color: red;
            ">${td.textContent}</span>`;

              // Clear cell background
              td.style.background = 'transparent !important';
              td.style.padding = '4px 2px !important';
            });
          });

          // Inside the row processing loop, add this after cloning:
          const actionColumn = rowClone.querySelector('td:nth-child(4)');
          if (actionColumn) {
            actionColumn.style.transform = 'scale(0.95)';
            actionColumn.style.transformOrigin = 'top left';
            actionColumn.style.width = `${actionColumn.offsetWidth / 0.97}px`; // Compensate width
            actionColumn.style.height = `${actionColumn.offsetHeight / 0.97}px`; // Compensate height
          }

          rowClone.querySelectorAll('.action-menu-container').forEach(menu => {
            menu.style.display = 'none';
          });
          actionColumn.querySelectorAll('table').forEach(nestedTable => {
            nestedTable.style.border = 'none !important';
            nestedTable.style.background = 'none !important';
          });
          actionColumn.querySelectorAll('td, th').forEach(cell => {
            cell.style.border = 'none !important';
            cell.style.padding = '0 !important';
          });

          //updates the width of table
          const newColumnWidths = [3, 6, 8, 65, 6, 6, 6];
          const tds = tableInRow.querySelectorAll('tr > td:not(table table td)');
          tds.forEach((td, index) => {
            td.style.width = `${newColumnWidths[index]}%`;
            td.style.boxSizing = 'border-box';
          });
          // List processing
          const processLists = (element, depth = 0) => {
            element.querySelectorAll('ul, ol').forEach(list => {
              list.style.listStyle = 'none';
              list.style.paddingLeft = '0';

              let counter = 1;
              const isOl = list.tagName === 'OL';

              Array.from(list.children).forEach(li => {
                li.innerHTML = li.innerHTML.replace(/^(\s*)(•|\d+\.?)\s+/, '');

                const marker = document.createElement('span');
                marker.className = 'list-marker';
                marker.style.width = '20px';
                marker.style.display = 'inline-block';

                if (isOl) {
                  const styles = ['decimal', 'lower-alpha', 'lower-roman']
                  marker.textContent = `${this.getMarker(counter, styles[depth % 3])}. `
                  counter++;
                } else {
                  const bullets = ['•', '•', '•'];
                  marker.textContent = `${bullets[depth % 3]} `;
                }

                li.insertBefore(marker, li.firstChild);
                if (li.querySelector('ul, ol')) processLists(li, depth + 1);
              })
            })
          }
          processLists(rowClone);

          // Content wrapper
          rowClone.querySelectorAll('li').forEach(li => {
            const contentWrapper = document.createElement('span');
            contentWrapper.style.display = 'inline-block'
            contentWrapper.style.width = 'calc(100% - 2px)'

            while (li.childNodes.length > 1) {
              contentWrapper.appendChild(li.childNodes[1]);
            }
            li.appendChild(contentWrapper)
          });

          // Temporary container
          const tempDiv = document.createElement('div')
          tempDiv.className = 'pdf-capture-mode'
          tempDiv.style.position = 'absolute'
          tempDiv.style.left = '-9999px'
          tempDiv.style.background = '#fff'
          tempDiv.style.marginLeft = '-20px'
          tempDiv.style.width = '1165px'
          rowClone.style.width = '1165px'
          tempDiv.appendChild(rowClone)
          document.body.appendChild(tempDiv)

          try {
            const canvas = await html2canvas(rowClone, {
              scale: 2,
              useCORS: true,
              backgroundColor: null,
              width: 1120,
              logging: true,
              allowTaint: true,
              letterRendering: true,
              fontFamilyCSS: '*',
              onclone: (clonedDoc) => {
                // Force layout stability
                clonedDoc.body.style.overflow = 'visible';
                clonedDoc.body.style.position = 'static';
              }
            })

            // Page management
            let renderedHeight = 0;
            while (renderedHeight < canvas.height) {
              const sliceHeightPx = Math.min(
                ((pageHeight - position - 10) * canvas.width) / usableWidth,
                canvas.height - renderedHeight
              )

              const sliceCanvas = document.createElement('canvas');
              sliceCanvas.width = canvas.width;
              sliceCanvas.height = sliceHeightPx;
              const sliceCtx = sliceCanvas.getContext('2d');
              sliceCtx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

              const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 1.0);
              const sliceImgHeight = (sliceHeightPx * usableWidth) / canvas.width;

              pdf.addImage(sliceImgData, 'JPEG', marginX, position, usableWidth+1, sliceImgHeight);

              renderedHeight += sliceHeightPx
              position += sliceImgHeight

              if (renderedHeight < canvas.height) {
                pdf.addPage(orientation, 'a4')
                position = marginY

                xPosition = marginX
                pdf.setFontSize(12)
                pdf.setFont('Arial', 'bold')

                // Main title
                const headerText = 'DASHBOARD MEETING POINTS (MDoNER)'
                const headerWidth = pdf.getTextWidth(headerText)
                pdf.setFillColor(255, 255, 0)
                pdf.rect(104, 6, headerWidth + 1.25, 6, 'F')
                pdf.text(headerText, pageWidth / 2, marginY, { align: 'center' })

                // Date header
                const today = new Date()
                const options = { timeZone: 'Asia/Kolkata' }
                const formattedDate = today.toLocaleDateString('en-IN', options)
                  .replace(/\//g, '.')
                  .replace(/\b(\d)\b/g, '0$1')
                pdf.setFillColor(255, 255, 0)
                pdf.rect(pageWidth - marginX - 30.2, marginY - 4.5, 30.2, 6, 'F')
                pdf.text(`As on ${formattedDate}`, pageWidth - marginX, marginY, { align: 'right' })

                // position += 18;
                position += 1

                pdf.setFontSize(7.5)
                pdf.setFont('Arial', 'bold')

                headers.forEach((header, index) => {
                  const cellWidth = mmWidths[index]
                  const textWidth = pdf.getTextWidth(header)
                  const paddedWidth = cellWidth + 1.5
                  const xStart = xPosition - 0.25

                  pdf.setFillColor(59, 130, 246)
                  pdf.rect(xStart, position, paddedWidth, 8, 'F')
                  pdf.text(
                    header,
                    xPosition + (cellWidth - textWidth) / 2,
                    position + 5.5
                  )
                  xPosition += cellWidth
                })
                position += 10
              }
            }
            document.body.removeChild(tempDiv)
          } catch (error) {
            console.error(`Row ${i} error:`, error)
            document.body.removeChild(tempDiv)
          }
        }

        pdf.save('dashboard.pdf');
      } catch (error) {
        console.error('PDF generation failed:', error);
      }
    },
    editTask (task) {
      if (!task) return;
      this.currentTask = { ...task }
      this.taskModalMode = 'edit'
      this.showTaskModal = true
    },
    async handleTaskSaved () {
      // Close modal
      this.closeTaskModal()
      // Refresh task list
      await this.fetchTasksByDate()
      // Optional: Show success message
      this.$toast.success('Task saved successfully')
    },

    async deleteTask (taskId) {
      if (confirm('Are you sure you want to delete this task?')) {
        try {
          await this.$http.secured.delete(`/task/${taskId}`)
          await this.fetchTasksByDate()
        } catch (error) {
          console.error('Error deleting task:', error)
        }
      }
    },

    openReviewModal (task) {
      if (!task) return;
      this.currentTask = task
      this.showReviewModal = true
    },

    async sendForReview (reviewerId) {
      try {
        const response = await this.$http.secured.post(`/task/${this.currentTask.id}/send_for_review`, {
          reviewer_id: reviewerId
        })
        
        if (response.data.success) {
          this.$toast.success(response.data.message)
        this.closeReviewModal()
        await this.fetchTasksByDate()
          
          // Navigate to the review page
          this.$router.push(`/review/${response.data.review_id}`)
        }
      } catch (error) {
        console.error('Error sending for review:', error)
        if (error.response && error.response.data && error.response.data.error) {
          this.$toast.error(error.response.data.error)
        } else {
          this.$toast.error('Failed to send task for review')
        }
      }
    },

    openCommentsModal (task) {
      if (!task) return;
      this.currentTask = task
      this.showCommentsModal = true
    },

    async approveTask (task) {
      if (!task) return;
      try {
        // Find the active review for this task
        const reviewsResponse = await this.$http.secured.get('/reviews')
        const activeReview = reviewsResponse.data.find(review => 
          review.task.id === task.id && review.status === 'pending'
        )
        
        if (activeReview) {
          const response = await this.$http.secured.post(`/review/${activeReview.id}/approve`)
          if (response.data.success) {
            this.$toast.success(response.data.message)
            await this.fetchTasksByDate()
          }
        } else {
          // Fallback to old approve method if no review found
        await this.$http.secured.post(`/task/${task.id}/approve`)
        await this.fetchTasksByDate()
        }
      } catch (error) {
        console.error('Error approving task:', error)
        if (error.response && error.response.data && error.response.data.error) {
          this.$toast.error(error.response.data.error)
        } else {
          this.$toast.error('Failed to approve task')
        }
      }
    },

    closeTaskModal () {
      this.showTaskModal = false
      this.currentTask = null
    },

    closeReviewModal () {
      this.showReviewModal = false
    },

    closeCommentsModal () {
      this.showCommentsModal = false
    },

    canDelete (task) {
      return task && this.userRole === 'editor' && task.status === 'draft'
    },

    canSendForReview (task) {
      // Allow editors to send for review when task is 'draft' OR when it's 'under_review' (for re-review)
      // Allow reviewers to send for review when task is 'draft' only
      if (!task) return false;
      
      if (this.userRole === 'editor') {
        return task.status === 'draft' || task.status === 'under_review'
      } else if (this.userRole === 'reviewer') {
        return task.status === 'draft'
      }
      
      return false
    },

    getReviewButtonText (task) {
      if (!task) return 'Send for Review';
      
      if (task.status === 'under_review') {
        return 'Send for Re-review';
      } else {
        return 'Send for Review';
      }
    },

    canApprove (task) {
      return task && (
        (this.userRole === 'reviewer' && task.status === 'under_review') ||
        (this.userRole === 'final_reviewer' && task.status === 'final_review')
      )
    },

    formatDate (date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },
    formatStatus(status) {
      if (!status) return 'Unknown';
      const statusMap = {
        draft: 'Editor',
        under_review: 'Reviewer',
        final_review: 'Review',
        approved: 'Approved',
        completed: 'Completed'
      };
      return statusMap[status] || status;
    },

    showActionMenu(taskId, event) {
      // Clear any pending hide timeout
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout);
        this.menuHideTimeout = null;
      }

      // Calculate global position for the dropdown
      const trigger = event ? event.target : document.querySelector(`[data-task-id="${taskId}"]`);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const menuWidth = 180;
        const menuHeight = 200; // Approximate menu height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate position with viewport boundary checks
        // Position menu directly below the trigger with slight overlap to prevent gaps
        let top = rect.bottom + 2; // Reduced gap
        let left = rect.right - menuWidth;
        
        // Adjust if menu would go off-screen
        if (left < 10) {
          left = rect.left; // Align to left of trigger
        }
        if (top + menuHeight > viewportHeight) {
          top = rect.top - menuHeight - 2; // Show above trigger with reduced gap
        }
        
        this.menuPosition = {
          position: 'fixed',
          top: `${Math.max(10, top)}px`,
          left: `${Math.max(10, Math.min(left, viewportWidth - menuWidth - 10))}px`,
          zIndex: '99999'
        };
      }
      this.activeMenuId = taskId;
    },

    hideActionMenu(taskId) {
      // Add a delay before hiding to allow mouse movement to menu
      this.menuHideTimeout = setTimeout(() => {
      if (this.activeMenuId === taskId) {
        this.activeMenuId = null;
      }
      }, 300); // 300ms delay
    },

    keepMenuOpen() {
      // Clear the hide timeout when hovering over menu
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout);
        this.menuHideTimeout = null;
      }
    },

    forceHideMenu() {
      // Immediately hide menu (for clicks, etc.)
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout);
        this.menuHideTimeout = null;
      }
      this.activeMenuId = null;
    },

    handleClickOutside(event) {
      // Close menu if clicking outside of menu or trigger
      if (this.activeMenuId) {
        const menu = document.querySelector('.global-action-menu.show');
        const trigger = document.querySelector(`[data-task-id="${this.activeMenuId}"]`);
        
        if (menu && !menu.contains(event.target) && 
            trigger && !trigger.contains(event.target)) {
          this.forceHideMenu();
        }
      }
    },

    getCurrentTask() {
      if (!this.activeMenuId || !this.activeTasks || !Array.isArray(this.activeTasks)) {
        return null;
      }
      return this.activeTasks.find(task => task && task.id === this.activeMenuId) || null;
    },

  }
}
</script>
<style scoped>
/* Main container */
.dashboard-container {
  padding: 1.5rem;
  min-height: calc(100vh - 4rem);
}

 /* Top action buttons container - Removed card styling */
.dashboard-actions {
  display: flex;
  justify-content: flex-end;
   align-items: center;
   gap: 0.75rem;
  margin-bottom: 1.5rem;
   /* Removed card styling - no background, padding, shadow, border */
}

 /* Create task button - compact styling like FinalDashboard */
.create-task-btn {
   padding: 0.5rem 1rem;
   background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
   border-radius: 6px;
   cursor: pointer;
   font-weight: 500;
   font-size: 0.8rem;
   transition: all 0.2s ease;
   box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-task-btn:hover {
   background: linear-gradient(135deg, #047857 0%, #059669 100%);
   transform: translateY(-1px);
   box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
}

.create-task-btn::before {
  content: "+";
  font-weight: bold;
  margin-right: 0.5rem;
}


 /* Filter button - compact styling like FinalDashboard */
.filter-btn {
  display: flex;
  align-items: center;
   gap: 6px;
   padding: 0.5rem 1rem;
   background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
   color: white;
   border: none;
   border-radius: 6px;
   cursor: pointer;
   font-weight: 500;
   font-size: 0.8rem;
   transition: all 0.2s ease;
   box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
}
.pdf-capture-mode {
  font-family: Arial !important;
  overflow: visible !important;
}

.pdf-capture-mode tr > td:not(table table td):nth-child(1),  /* S No. */
.pdf-capture-mode tr > td:not(table table td):nth-child(2),  /* Sector/Division */
.pdf-capture-mode tr > td:not(table table td):nth-child(3),  /* Description */
.pdf-capture-mode tr > td:not(table table td):nth-child(5),  /* Original Date */
.pdf-capture-mode tr > td:not(table table td):nth-child(6),  /* Responsibility */
.pdf-capture-mode tr > td:not(table table td):nth-child(7) { /* Review Date */
  font-size: 12px !important;
  line-height: 1.2 !important;
}

/* the following code makes the content uniform (12px) for 4th col. remove them to preserve the styling of "action to be taken" */

.pdf-capture-mode td {
  font-size: 12pt !important;
  padding: 2px 5px !important;
}


.filter-btn:hover {
   background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
   transform: translateY(-1px);
   box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);
}


.pdf-capture-mode td:nth-child(4) {
  overflow: visible !important;
  padding: 5px !important;
}

.pdf-capture-mode td:nth-child(4) * {
  transform-origin: top left !important;
  display: inline-block !important; /* Required for proper scaling */
}

 /* Compact Government Style Table Headers */
.table-headers {
   background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  margin-bottom: 0.5rem;
   border-radius: 8px 8px 0 0;
   width: 100%;
   box-sizing: border-box;
   box-shadow: 0 2px 8px rgba(0,0,0,0.05);
   overflow: hidden;
}

.table-headers table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
   margin: 0;
}

.table-headers th {
   color: white;
   font-size: 0.65rem;
   font-weight: 600;
  text-align: left;
   padding: 0.75rem;
  white-space: normal;
   border-right: 1px solid rgba(255, 255, 255, 0.2);
   background: transparent;
   line-height: 1.3;
 }

 .table-headers th:last-child {
   border-right: none;
 }

 /* Compact Table rows */
.table-row {
  background: white;
   border-radius: 0;
   margin: 0.5rem 0;
   box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  text-align: center;
   width: 100%;
   box-sizing: border-box;
   border: 1px solid #e9ecef;
   overflow: visible; /* Allow action menus to extend outside row */
 }

 .table-row:last-child {
   border-radius: 0 0 8px 8px;
}

.table-row table {
   width: 100%;
   margin: 0;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.table-row td {
   padding: 0.75rem;
   color: #495057;
   font-size: 0.8rem;
  vertical-align: middle;
   line-height: 1.4;
  white-space: normal;
  word-break: break-word;
   border-right: 1px solid #f8f9fa;
   background: white;
   overflow: hidden;
 }



 .table-row td:last-child {
   border-right: none;
 }

 /* Optimized Column widths - Maximum space for Action column */
.table-headers th:nth-child(1),
 .table-row td:nth-child(1) { 
   width: 5%; 
   min-width: 50px;
 }

.table-headers th:nth-child(2),
 .table-row td:nth-child(2) { 
   width: 10%; 
   min-width: 100px;
 }

.table-headers th:nth-child(3),
 .table-row td:nth-child(3) { 
   width: 12%; 
   min-width: 120px;
 }

.table-headers th:nth-child(4),
 .table-row td:nth-child(4) { 
   width: 55%; 
   min-width: 400px;
   overflow: hidden !important;
   word-wrap: break-word;
   white-space: normal;
   text-align: left !important;
 }

.table-headers th:nth-child(5),
 .table-row td:nth-child(5) { 
   width: 6%; 
   min-width: 70px;
 }

.table-headers th:nth-child(6),
 .table-row td:nth-child(6) { 
   width: 8%; 
   min-width: 90px;
 }

.table-headers th:nth-child(7),
 .table-row td:nth-child(7) { 
   width: 4%; 
   min-width: 50px;
 }

.table-headers th:nth-child(8),
.table-row td:nth-child(8) { width: 8%; }

.table-headers th:nth-child(9),
.table-row td:nth-child(9) { width: 5%; }


.status-draft {
  color: #a53412 !important;
  background-color: #ebbf80;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
}

.status-review {
  color: #1e40af !important;
  background-color: #dbeafe;
  padding: 12px 7px;
  border-radius: 24px;
  font-size: 0.55rem;
  font-weight: bolder;
}

.status-final-review {
  color: #5b21b6 !important;
  background-color: #ede9fe;
  padding: 12px 8px;
  border-radius: 4px;
  font-size: 0.55rem;
  font-weight: bold;
}

.status-unknown {
  color: #6B7280 !important;
  background-color: #F3F4F6;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
}


/* Actions cell styling */
.actions-cell {
  padding: 1rem 0.8rem !important;
  text-align: center !important;
  vertical-align: middle !important;
  overflow: visible !important;
  position: static !important; /* Remove stacking context */
}

.table-row td:nth-child(8) {
  padding: 1rem 0.8rem !important;
  text-align: left !important;
  vertical-align: middle !important;
  overflow: visible !important;
  position: relative;
}

.action-menu-container {
  position: static; /* Remove stacking context */
  overflow: visible !important;
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-trigger {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  font-size: 1.25rem;
  transition: all 0.2s;
  cursor: pointer;
}

.action-trigger:hover {
  background: #F3F4F6;
  color: #374151;
  transform: scale(1.1);
}

/* Active state when menu is open */
.action-trigger.active {
  background: #EBF4FF;
  color: #2563EB;
  transform: scale(1.1);
}

/* Global Action Menu - Outside table structure */
.global-action-menu {
  position: fixed;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 0.375rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  min-width: 180px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.15s ease; /* Faster transition */
  z-index: 99999 !important; /* Highest possible z-index */
  pointer-events: none; /* Prevent interaction when hidden */
  /* Add a small padding area to help with hover */
  padding: 0.25rem 0;
}

.global-action-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto; /* Enable interaction when visible */
}

/* Remove old action-menu styles since we're using global menu */
.action-menu {
  display: none !important;
}

.menu-item {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  font-size: 0.875rem;
  transition: all 0.2s;
  cursor: pointer;
  display: block;
  border-radius: 0.25rem;
  margin: 0.25rem;
}

.menu-item:nth-child(1) {
  color: #3B82F6;
  font-weight: bold;
}
.menu-item:nth-child(1):hover {
  background-color: #d7e1ef;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.menu-item:nth-child(2) {
  color: #EF4444;
  font-weight: bold;
}
.menu-item:nth-child(2):hover {
  background-color: #f5d8d8;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
}

.menu-item:nth-child(3) {
  font-weight: bold;
  color: #10B981;
}
.menu-item:nth-child(3):hover {
  background-color: #e2f5ee;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

.menu-item:nth-child(4) {
  color: #8B5CF6;
  font-weight: bold;
}
.pdf-capture-mode ul {
  list-style: none !important;
  padding-left: 1.5em;
}
.pdf-capture-mode ul li::before {
  content: '• ';
  color: #222;
  font-size: 1em;
  margin-right: 4px;
}

.pdf-capture-mode ol {
  list-style: none !important;
  counter-reset: pdfcounter;
  padding-left: 1.5em;
}
.pdf-capture-mode ol li {
  counter-increment: pdfcounter;
}
.pdf-capture-mode ol li::before {
  content: counter(pdfcounter) ". ";
  color: #222;
  font-size: 1em;
  margin-right: 4px;
}

.menu-item:nth-child(4):hover {
  background-color: #F5F3FF;
  box-shadow: 0 2px 4px rgba(139, 92, 246, 0.1);
}

.highlighted-row {
  background-color: #F8FAFC;
  border: 1px solid #3B82F6;
}

.table-row:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

 /* Action Content Styling - Compact with Auto-scaling */
.action-content-cell {
  text-align: left !important;
  vertical-align: top !important;
   padding: 0.75rem !important;
   overflow: hidden !important;
   word-wrap: break-word;
   line-height: 1.4;
   max-width: 100% !important;
   position: relative;
   box-sizing: border-box;
   /* Smooth transition for scaling */
   transition: transform 0.3s ease;
 }

 .action-content-cell ul, .action-content-cell ol {
   margin: 6px 0;
   padding-left: 0;
   list-style: none;
 }

 .action-content-cell li {
   margin: 3px 0;
   list-style: none;
  display: flex;
  align-items: flex-start;
   line-height: 1.3;
 }

 .action-content-cell .list-marker {
   font-weight: 600;
   margin-right: 6px;
   min-width: 18px;
   color: #1e40af;
  flex-shrink: 0;
 }

 /* Compact table styling within action content */
 .action-content-cell table {
   width: 100% !important;
   max-width: 100% !important;
   border-collapse: collapse !important;
   margin: 0.4rem 0 !important;
   font-size: 0.75rem !important;
   table-layout: auto !important;
   overflow-wrap: break-word !important;
   /* Smooth transition for table scaling */
   transition: transform 0.3s ease;
   transform-origin: top left;
 }

 .action-content-cell table th,
 .action-content-cell table td {
   border: 1px solid #d1d5db !important;
   padding: 4px 6px !important;
   text-align: left !important;
   word-wrap: break-word !important;
   overflow-wrap: break-word !important;
   font-size: 0.7rem !important;
 }

 .action-content-cell table th {
   background-color: #f3f4f6 !important;
   font-weight: 600 !important;
   font-size: 0.7rem !important;
 }

 .action-content-cell table td {
   font-size: 0.7rem !important;
 }

/* 🎯 UNIFIED: Clean Action Node Hierarchical Styling with DEEP SELECTORS */
.action-content-cell /deep/ .action-node {
   display: flex !important;
   align-items: flex-start !important;
  margin: 4px 0 !important;
  padding: 2px 0 !important;
   line-height: 1.4 !important;
  font-size: inherit !important; /* Prevent auto-scaling interference */
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

/* 📐 ENHANCED: Hierarchical indentation with DEEP SELECTORS - FIXED! */
.action-content-cell /deep/ .action-node.level-1 { 
  margin-left: 0px !important; 
  /* background-color: rgba(59, 130, 246, 0.02) !important; */
}
.action-content-cell /deep/ .action-node.level-2 { 
  margin-left: 40px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 8px !important;
}
.action-content-cell /deep/ .action-node.level-3 { 
  margin-left: 80px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(139, 92, 246, 0.3) !important; */
  padding-left: 8px !important;
}
.action-content-cell /deep/ .action-node.level-4 { 
  margin-left: 120px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 8px !important;
}
.action-content-cell /deep/ .action-node.level-5 { 
  margin-left: 160px !important; 
  /* background-color: rgba(239, 68, 68, 0.02) !important; */
  /* border-left: 2px solid rgba(239, 68, 68, 0.3) !important; */
  padding-left: 8px !important;
}

/* 🔧 ADDITIONAL: Multiple selector approaches for maximum compatibility */
table .action-content-cell /deep/ .action-node.level-2,
td .action-content-cell /deep/ .action-node.level-2 {
  margin-left: 40px !important;
  padding-left: 8px !important;
  /* background-color: rgba(16, 185, 129, 0.05) !important; */
  /* border-left: 3px solid rgba(16, 185, 129, 0.4) !important; */
}
table .action-content-cell /deep/ .action-node.level-3,
td .action-content-cell /deep/ .action-node.level-3 {
  margin-left: 80px !important;
  padding-left: 8px !important;
  /* background-color: rgba(245, 158, 11, 0.05) !important; */
  /* border-left: 3px solid rgba(139, 92, 246, 0.4) !important; */
}
table .action-content-cell /deep/ .action-node.level-4,
td .action-content-cell /deep/ .action-node.level-4 {
  margin-left: 120px !important;
  padding-left: 8px !important;
  /* background-color: rgba(139, 92, 246, 0.05) !important; */
  /* border-left: 3px solid rgba(245, 158, 11, 0.4) !important; */
}

/* 🎨 UNIFIED: List style colors with DEEP SELECTORS (clear visual hierarchy) */
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

/* 📅 Review date styling with DEEP SELECTORS - yellow highlight */
.action-content-cell /deep/ .action-node .node-content .review-date {
   font-size: 0.85em !important;
   color: #333 !important;
   font-weight: 500 !important;
   margin-left: 8px !important;
  /* background-color: #ffeb3b !important; */
   padding: 2px 6px !important;
   border-radius: 4px !important;
   display: inline-block !important;
   line-height: 1.2 !important;
 }

.action-content-cell /deep/ .action-node .node-content .review-date.today {
  color: #d32f2f !important; /* Red text for today */
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
  /* color: #059669 !important; */
  font-weight: 500 !important; /* Slightly bold */
}
.action-content-cell /deep/ .action-node.completed .node-marker { 
  /* color: #10b981 !important; */
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

/* 💪 NUCLEAR OPTION: Global styles that bypass scoping entirely */
td.action-content-cell .action-node.level-2 { 
  margin-left: 40px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 8px !important;
}
td.action-content-cell .action-node.level-3 { 
  margin-left: 80px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 8px !important;
}
td.action-content-cell .action-node.level-4 { 
  margin-left: 120px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  border-left: 2px solid rgba(245, 158, 11, 0.3) !important;
  padding-left: 8px !important;
}
 
 .action-content-cell p { margin: 0.25em 0 !important; }
 .action-content-cell br { line-height: 1.2 !important; }

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

 /* Ensure auto-scaled content maintains proper spacing and structure */
 .action-content-cell.auto-scaled-small /deep/ .action-node,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node {
   margin: 2px 0 !important;
   padding: 1px 0 !important;
   display: flex !important;
   align-items: flex-start !important;
 }

 /* Preserve hierarchical indentation even when scaled */
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-1,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-1 { margin-left: 0 !important; }
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-2,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-2 { margin-left: 16px !important; }
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-3,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-3 { margin-left: 32px !important; }
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-4,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-4 { margin-left: 48px !important; }

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

.download-pdf-btn {
   padding: 0.5rem 1rem;
   background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
   border-radius: 6px;
   cursor: pointer;
   font-weight: 500;
   font-size: 0.8rem;
   transition: all 0.2s ease;
   box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}

.download-pdf-btn:hover {
   background: linear-gradient(135deg, #047857 0%, #059669 100%);
   transform: translateY(-1px);
   box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
}
</style>
