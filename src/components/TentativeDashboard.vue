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
          <td v-html="processActionContent(task.action_to_be_taken)" style="align-content: center; !important;"></td>
          <td>{{ formatDate(task.original_date) }}</td>
          <td>{{ task.responsibility }}</td>
          <td>{{ formatDate(task.review_date) }}</td>
          <td><span :class="statusClass[task.status]">{{ formatStatus(task.status) }}</span></td>
          <td>
            <div class="action-menu-container">
              <button class="action-trigger"
                      @mouseenter="showActionMenu(task.id)"
                      @mouseleave="hideActionMenu(task.id)">
                ⋮
                <div class="action-menu" :class="{ 'show': activeMenuId === task.id }">
                  <button @click="editTask(task)" class="menu-item">Edit</button>
                  <button v-if="canDelete(task)"
                          @click="deleteTask(task.id)"
                          class="menu-item">Delete</button>
                  <button v-if="canSendForReview(task)"
                          @click="openReviewModal(task)"
                          class="menu-item">Send for Review</button>
                  <button @click="openCommentsModal(task)"
                          class="menu-item">Comments</button>
                  <button v-if="canApprove(task)"
                          @click="approveTask(task)"
                          class="menu-item">Approve</button>
                </div>
              </button>
            </div>
          </td>
        </tr>
      </table>
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
import ParticleBackground from './ParticleBackground.vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'


export default {
  name: 'TentativeDashboard',

  components: {
    TaskModal,
    ReviewModal,
    CommentsModal,
    Datepicker,
    ParticleBackground,
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
      pdfVisible: false,

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
    }
  },
  mounted() {
    if (this.$route.query.highlightTaskId) {
      const row = document.querySelector(`tr[data-task-id="${this.$route.query.highlightTaskId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        row.classList.add('highlight-transition')
      }
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
        completed: 'status-completed'
      }
    }
  },

  created () {
    console.log('Route Query:', this.$route.query)
    this.fetchTasksByDate()
  },

  methods: {
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

        const processedTasks = await Promise.all(response.data.active.map(async task => {
          const nearestDate = this.findNearestDate(task.action_to_be_taken, task.review_date);

          if (nearestDate && nearestDate !== task.review_date) {
            try {
              await this.$http.secured.put(`/task/${task.id}`, {
                task: {
                  review_date: nearestDate
                }
              })
            } catch (error) {
              console.error('Error updating review date:', error)
            }
          }

          return {
            ...task,
            review_date: nearestDate || task.review_date
          }
        }))

        this.activeTasks = processedTasks.sort((a, b) => {
          const dateA = new Date(a.review_date)
          const dateB = new Date(b.review_date)
          return dateA - dateB
        })
        this.completedTasks = response.data.completed
      } catch (error) {
        console.error('Error fetching tasks:', error)
      }
    },
    processActionContent(content) {
      if (!content) return ''
      const today = new Date()
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html');

        const processNode = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const dateRegex = /(\d{1,2})\/(\d{1,2})/g
            let newContent = node.textContent

            newContent = newContent.replace(dateRegex, (match, day, month) => {
              const dayNum = parseInt(day)
              const monthNum = parseInt(month)
              const paddedDay = dayNum.toString().padStart(2, '0')
              const paddedMonth = monthNum.toString().padStart(2, '0')
              const standardizedDate = `${paddedDay}/${paddedMonth}`
              if (dayNum === today.getDate() && monthNum === (today.getMonth() + 1)) {
                return `<span style="color: red; background-color: yellow">${standardizedDate}</span>`
              }
              return `<span style="background-color: yellow">${standardizedDate}</span>`
            });

            if (newContent !== node.textContent) {
              const span = doc.createElement('span')
              span.innerHTML = newContent
              node.parentNode.replaceChild(span, node)
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach(processNode)
          }
        }
        Array.from(doc.body.childNodes).forEach(processNode)
        return doc.body.innerHTML
      } catch (error) {
        console.error('Error in processActionContent:', error)
        return content
      }
    },
    findNearestDate (content, currentReviewDate) {
      if (!content) return currentReviewDate
      const dateRegex = /(\d{2})\/(\d{2})/g
      // Create today's date in Indian timezone
      const today = new Date()
      const indiaOffset = 330
      const localOffset = today.getTimezoneOffset()
      const totalOffset = indiaOffset + localOffset
      const indiaToday = new Date(today.getTime() + totalOffset * 60000)

      let validDates = []
      if (currentReviewDate) {
        validDates.push(new Date(currentReviewDate))
      }

      let matches = content.matchAll(dateRegex)
      for (const match of matches) {
        const [, day, month] = match
        let adjustedDay = parseInt(day) + 1
        let adjustedMonth = parseInt(month)
        let year = 2024

        const daysInMonth = new Date(year, adjustedMonth, 0).getDate()
        if (adjustedDay > daysInMonth) {
          adjustedDay = 1
          adjustedMonth++
          if (adjustedMonth > 12) {
            adjustedMonth = 1
            year++
          }
        }

        let date = new Date(year, adjustedMonth - 1, adjustedDay);
        date = new Date(date.getTime() + totalOffset * 60000);

        if (date < indiaToday) {
          year = 2025;
          date = new Date(year, adjustedMonth - 1, adjustedDay);
          date = new Date(date.getTime() + totalOffset * 60000);
        }

        validDates.push(date);
      }
      const futureDates = validDates.filter(date => date > indiaToday);
      if (futureDates.length > 0) {
        const earliestDate = new Date(Math.min(...futureDates));

        return earliestDate.toISOString().split('T')[0];
      }

      return currentReviewDate;
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
      this.currentTask = task
      this.showReviewModal = true
    },

    async sendForReview (reviewerId) {
      try {
        await this.$http.secured.post(`/task/${this.currentTask.id}/send_for_review`, {
          reviewer_id: reviewerId
        })
        this.closeReviewModal()
        await this.fetchTasksByDate()
      } catch (error) {
        console.error('Error sending for review:', error)
      }
    },

    openCommentsModal (task) {
      this.currentTask = task
      this.showCommentsModal = true
    },

    async approveTask (task) {
      try {
        await this.$http.secured.post(`/task/${task.id}/approve`)
        await this.fetchTasksByDate()
      } catch (error) {
        console.error('Error approving task:', error)
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
      return this.userRole === 'editor' && task.status === 'draft'
    },

    canSendForReview (task) {
      return (this.userRole === 'editor' || this.userRole === 'reviewer') && task.status === 'draft'
    },

    canApprove (task) {
      return (
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
      const statusMap = {
        draft: 'Editor',
        under_review: 'Reviewer',
        final_review: 'Review',
        approved: 'Approved',
        completed: 'Completed'
      };
      return statusMap[status] || status;
    },

    showActionMenu(taskId) {
      this.activeMenuId = taskId;
    },

    hideActionMenu(taskId) {
      if (this.activeMenuId === taskId) {
        this.activeMenuId = null;
      }
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

/* Top action buttons container */
.dashboard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

/* Create task button */
.create-task-btn {
  width: 173px;
  height: 39px;
  padding: 10px 25px;
  background: #009951;
  color: white;
  border-radius: 54px;
  border: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: bold;

}

.create-task-btn:hover {
  background: #008544;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.create-task-btn::before {
  content: "+";
  font-weight: bold;
  margin-right: 0.5rem;
}


/* Filter button */
.filter-btn {
  width: 173px;
  height: 39px;
  padding: 10px 25px;
  gap: 16px;
  border-radius: 54px;
  background: white;
  color: #1F2937;
  border: 1px solid #E2E8F0;
  font-size: 0.875rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  background: #F8FAFC;
}


.pdf-capture-mode td:nth-child(4) {
  overflow: visible !important;
  padding: 5px !important;
}

.pdf-capture-mode td:nth-child(4) * {
  transform-origin: top left !important;
  display: inline-block !important; /* Required for proper scaling */
}

/* Table headers section */
.table-headers {
  background: white;
  margin-bottom: 0.5rem;
  border-bottom: 3px solid #3B82F6;
  padding: 0 1rem;
}

.table-headers table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.table-headers th {
  color: #374151;
  font-size: 0.76rem;
  font-weight: 700;
  text-align: left;
  padding: 0.5rem 0.8rem;
  white-space: normal;
}

/* Table rows */
.table-row {
  background: white;
  border-radius: 0.5rem;
  margin: 0.75rem 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.table-row table {
  width: calc(100% - 2rem);
  margin: 0 1rem;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.table-row td {
  padding: 1rem 0.8rem;
  color: #1F2937;
  font-size: 0.85rem;
  vertical-align: middle;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
}

/* Column widths */
.table-headers th:nth-child(1),
.table-row td:nth-child(1) { width: 3%; }

.table-headers th:nth-child(2),
.table-row td:nth-child(2) { width: 10%; }

.table-headers th:nth-child(3),
.table-row td:nth-child(3) { width: 12%; }

.table-headers th:nth-child(4),
.table-row td:nth-child(4) { width: 67%; }

.table-headers th:nth-child(5),
.table-headers th:nth-child(6),
.table-headers th:nth-child(7),
.table-row td:nth-child(5),
.table-row td:nth-child(6),
.table-row td:nth-child(7) { width: 7%; }


.table-headers th:nth-child(6),
.table-row td:nth-child(6) { width: 10%; }


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


.table-row td:nth-child(8) {
  padding: 1rem 0.8rem !important;
  text-align: left !important;
  vertical-align: middle !important;
}

.action-menu-container {
  position: relative;
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
}

.action-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s;
  z-index: 50;
}

.action-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
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
.download-pdf-btn {
  width: 173px;
  height: 39px;
  padding: 10px 25px;
  background: #3B82F6;
  color: white;
  border-radius: 54px;
  border: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: bold;
}

.download-pdf-btn:hover {
  background: #2563EB;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
</style>
