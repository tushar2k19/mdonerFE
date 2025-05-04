<template>
  <div class="modal-overlay"  @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ mode === 'add' ? 'Add Task' : 'Edit Task' }}</h3>
        <button class="btn-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Sector/Division</label>
          <input
            v-model="formData.sector_division"
            type="text"
            class="form-control"
          >
        </div>

        <div class="form-group">
          <label>Description</label>
          <input
            v-model="formData.description"
            type="text"
            class="form-control"
          >
        </div>

        <div class="form-group">
          <label>Action to be Taken</label>
          <editor
            :api-key="apiKey"
            :init="editorConfig"
            v-model="formData.action_to_be_taken"
          />
        </div>

        <div class="form-group">
          <label>Original Date</label>
          <datepicker
            v-model="formData.original_date"
            class="custom-datepicker"
            :calendar-class="'calendar-wrapper'"
            :input-class="'datepicker-input'"
            :monday-first="true"
            format="dd MMM yyyy"
          ></datepicker>
        </div>

        <div class="form-group">
          <label>Responsibility</label>
          <input
            v-model="formData.responsibility"
            type="text"
            class="form-control"
          >
        </div>

        <div class="form-group">
          <label>Review Date</label>
          <datepicker
            v-model="formData.review_date"
            class="custom-datepicker"
            :calendar-class="'calendar-wrapper'"
            :input-class="'datepicker-input'"
            :monday-first="true"
            format="dd MMM yyyy"
          ></datepicker>
        </div>
      </div>


      <div class="modal-footer">
        <button @click="$emit('close')" class="btn">Cancel</button>
        <button @click="saveTask" class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>
</template>
<script>
import Editor from '@tinymce/tinymce-vue'
import Datepicker from 'vuejs-datepicker'

export default {
  name: 'TaskModal',

  components: {
    Editor,
    Datepicker
  },

  props: {
    task: {
      type: Object,
      default: null
    },
    mode: {
      type: String,
      default: 'add'
    }
  },

  data() {
    return {
      formData: {
        sector_division: '',
        description: '',
        action_to_be_taken: '',
        original_date: null,
        responsibility: '',
        review_date: null
      },
      apiKey: 'dplkib2z908z9mmeu2yjsq7c95iqj1ez7prx8nzktlg70096',
      editorConfig: {
        height: 425,
        menubar: true,

        plugins: [
          'advlist autolink lists link charmap preview',
          'searchreplace visualblocks code fullscreen',
          'table paste code help wordcount',
          'textcolor visualchars directionality',
          'textpattern'
        ],

        toolbar: [
          'undo redo | formatselect | bold italic underline strikethrough | superscript subscript',
          'fontsizeselect | forecolor backcolor | alignleft aligncenter alignright alignjustify',
          'bullist numlist outdent indent | table | charmap hr',
          'removeformat | help | code fullscreen'
        ].join(' | '),

        // Basic settings
        branding: false,
        promotion: false,

        // Font settings
        fontsize_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt',

        // Table settings
        table_default_attributes: {
          border: '1'
        },
        table_appearance_options: true,
        table_advtab: true,

        // Color settings
        color_map: [
          '000000', 'Black',
          '808080', 'Gray',
          'FFFFFF', 'White',
          'FF0000', 'Red',
          '0000FF', 'Blue',
          '008000', 'Green',
          'FFFF00', 'Yellow',
          'FF00FF', 'Magenta',
          '00FFFF', 'Cyan',
          '800000', 'Maroon',
          '008080', 'Teal',
          '800080', 'Purple'
        ],

        // Add these settings
        force_br_newlines: false,
        force_p_newlines: true,
        forced_root_block: 'p',
        remove_trailing_brs: true,

        // Modify your content_style to handle spacing better
        content_style: `
    body { margin: 1rem; }
    ul { list-style-type: disc !important; padding-left: 2em !important; margin: 0.25em 0 !important; }
    ol { list-style-type: decimal !important; padding-left: 2em !important; margin: 0.25em 0 !important; }
    ul li, ol li { margin: 0.25em 0 !important; display: list-item !important; }
    p { margin: 0.5em 0 !important; }
    `
      }
    }
  },
  created () {
    // If editing existing task, populate form
    if (this.task) {
      this.formData = {
        sector_division: this.task.sector_division,
        description: this.task.description,
        action_to_be_taken: this.task.action_to_be_taken,
        original_date: new Date(this.task.original_date),
        responsibility: this.task.responsibility,
        review_date: this.task.review_date ? new Date(this.task.review_date) : null
      }
    }
  },

  methods: {
    validateForm() {
      const requiredFields = [
        { field: 'sector_division', label: 'Sector/Division' },
        { field: 'description', label: 'Description' },
        { field: 'action_to_be_taken', label: 'Action to be Taken' },
        { field: 'original_date', label: 'Original Date' },
        { field: 'responsibility', label: 'Responsibility' },
        { field: 'review_date', label: 'Review Date' }
      ]

      for (const { field, label } of requiredFields) {
        if (!this.formData[field]) {
          this.$toast.error(`${label} is required`)
          return false
        }
      }
      return true
    },

    async saveTask() {
      if (!this.validateForm()) return
      try {
        const taskData = {
          ...this.formData,
          original_date: this.formatDate(this.formData.original_date),
          review_date: this.formatDate(this.formData.review_date)
        }

        if (this.mode === 'edit' && this.task) {
          await this.$http.secured.put(`/task/${this.task.id}`, taskData)
        } else {
          await this.$http.secured.post('/task', taskData)
        }

        this.$emit('save')
        this.$emit('close')
        this.$toast.success(`Task ${this.mode === 'edit' ? 'updated' : 'created'} successfully`)
      } catch (error) {
        console.error('Error saving task:', error)
        this.$toast.error('Error saving task')
      }
    },

    formatDate(date) {
      if (!date) return null
      return date.toISOString().split('T')[0]
    },

    closeModal() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.custom-datepicker {
  position: relative;

  color: #1a1a1a;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

.modal-header {
  background: rgba(0, 128, 128, 0.16);
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #040548;
  font-weight: 700;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.modal-body {
  padding: 1.5rem;
  background: linear-gradient(
    to bottom,
    rgba(0, 70, 128, 0.05),
    rgba(0, 54, 102, 0.02)
  );
}

.modal-footer {
  padding: 1.25rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: white;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 70, 128, 0.2);
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1f2937;
  transition: all 0.2s ease;
  background: white;
  position: relative;
  z-index: 1;
}

.form-control:focus {
  outline: none;
  border-color: #004680;
  box-shadow: 0 0 0 3px rgba(0, 70, 128, 0.1);
}

.btn {
  padding: 0.675rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.925rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #004680;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 70, 128, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #003666;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 70, 128, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: black;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.btn-close:hover {
  background: black;
  color: white;
  transform: rotate(90deg);
}

/* Date picker customization */
.vdp-datepicker input {
  width: 100%;
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(0, 70, 128, 0.2);
  border-radius: 8px;
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: rgba(0, 70, 128, 0.05);
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #004680;
  border-radius: 3px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Styles for TinyMCE */
:deep(.tox-tinymce) {
  border-radius: 8px !important;
  border-color: rgba(0, 70, 128, 0.2) !important;
}

:deep(.tox-tinymce:focus-within) {
  border-color: #004680 !important;
  box-shadow: 0 0 0 3px rgba(0, 70, 128, 0.1) !important;
}
</style>
