# File Upload Icon Options for DynamicForm.jsx

## Current Implementation Analysis

The current file input in [`DynamicForm.jsx`](src/components/DynamicForm.jsx:202-226) uses a standard HTML file input with Tailwind styling:

```jsx
case 'file':
  const { multiple = false, accept } = field;
  return (
    <div key={name} className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        type="file"
        multiple={multiple}
        accept={accept}
        {...register(name, {
          required: required ? `${label} is required` : false
        })}
        className={`${baseInputClasses} file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${errorClasses}`}
      />
      {multiple && (
        <p className="mt-1 text-xs text-gray-500">You can select multiple files</p>
      )}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
      )}
    </div>
  );
```

## Icon-Based File Upload Options

### Option 1: Inline SVG Icon Button (Consistent with Current Design)

**Description**: Replace the file input with a custom button that uses an SVG icon, similar to the existing Cancel/Save buttons in the form.

**Visual Style**: Matches the existing [`Cancel`](src/components/DynamicForm.jsx:288-297) and [`Save`](src/components/DynamicForm.jsx:298-308) buttons

**Code Implementation**:

```jsx
case 'file':
  const { multiple = false, accept } = field;
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  return (
    <div key={name} className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        {...register(name, {
          required: required ? `${label} is required` : false
        })}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Custom icon button */}
      <button
        type="button"
        onClick={handleFileClick}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors nodrag"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose Files'}
      </button>

      {selectedFiles.length > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          {selectedFiles.map((file, index) => (
            <div key={index}>{file.name}</div>
          ))}
        </div>
      )}

      {multiple && (
        <p className="mt-1 text-xs text-gray-500">You can select multiple files</p>
      )}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
      )}
    </div>
  );
```

**Pros**:

- Consistent with existing button design
- Clean, minimal appearance
- Shows file count when files are selected
- Easy to implement

**Cons**:

- Less visual prominence than other options
- Requires additional state management

---

### Option 2: Drag & Drop Area with Upload Icon

**Description**: Create a drag-and-drop zone with a prominent upload icon in the center.

**Code Implementation**:

```jsx
case 'file':
  const { multiple = false, accept } = field;
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
    // Manually trigger form registration
    const event = { target: { files: e.dataTransfer.files } };
    fileInputRef.current.files = e.dataTransfer.files;
    handleFileChange(event);
  };

  return (
    <div key={name} className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        {...register(name, {
          required: required ? `${label} is required` : false
        })}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Area */}
      <div
        onClick={handleFileClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors nodrag ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : selectedFiles.length > 0
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${errors[name] ? 'border-red-300' : ''}`}
      >
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        {selectedFiles.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-green-600">
              {selectedFiles.length} file(s) selected
            </p>
            <div className="mt-2 text-xs text-gray-600">
              {selectedFiles.map((file, index) => (
                <div key={index}>{file.name}</div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {accept ? `Accepted formats: ${accept}` : 'Any file type'}
            </p>
          </div>
        )}
      </div>

      {multiple && (
        <p className="mt-1 text-xs text-gray-500">You can select multiple files</p>
      )}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
      )}
    </div>
  );
```

**Pros**:

- Modern, intuitive drag-and-drop interface
- Large, prominent upload area
- Visual feedback for drag states
- Shows selected files clearly

**Cons**:

- Takes up more vertical space
- More complex implementation
- Requires additional state management

---

### Option 3: Compact Icon-Only Button

**Description**: A small, compact button with just an upload icon, similar to the edit button in [`FormNode.jsx`](src/components/FormNode.jsx:54-62).

**Code Implementation**:

```jsx
case 'file':
  const { multiple = false, accept } = field;
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  return (
    <div key={name} className="mb-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          {...register(name, {
            required: required ? `${label} is required` : false
          })}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Compact icon button */}
        <button
          type="button"
          onClick={handleFileClick}
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100 nodrag"
          title="Upload files"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>{selectedFiles.length} file(s) selected:</strong>
          {selectedFiles.map((file, index) => (
            <div key={index} className="truncate">{file.name}</div>
          ))}
        </div>
      )}

      {multiple && (
        <p className="mt-1 text-xs text-gray-500">You can select multiple files</p>
      )}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
      )}
    </div>
  );
```

**Pros**:

- Very compact, doesn't take extra space
- Consistent with existing icon button pattern
- Clean, minimal design

**Cons**:

- Less discoverable for users
- Requires tooltip for clarity
- File list display takes additional space

---

### Option 4: Enhanced Button with File Type Icons

**Description**: A button that shows different icons based on the accepted file types and displays file previews.

**Code Implementation**:

```jsx
case 'file':
  const { multiple = false, accept } = field;
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const getFileTypeIcon = () => {
    if (!accept) return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    );

    if (accept.includes('image')) return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );

    if (accept.includes('pdf') || accept.includes('doc')) return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );

    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    );
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  return (
    <div key={name} className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        {...register(name, {
          required: required ? `${label} is required` : false
        })}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Enhanced button with file type icon */}
      <button
        type="button"
        onClick={handleFileClick}
        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors nodrag ${
          selectedFiles.length > 0
            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
      >
        {getFileTypeIcon()}
        <span className="ml-2">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} file(s) selected`
            : `Choose ${accept?.includes('image') ? 'Images' : accept?.includes('pdf') ? 'Documents' : 'Files'}`
          }
        </span>
      </button>

      {selectedFiles.length > 0 && (
        <div className="mt-2 space-y-1">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
              <span className="truncate">{file.name}</span>
              <span className="ml-auto text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ))}
        </div>
      )}

      {multiple && (
        <p className="mt-1 text-xs text-gray-500">You can select multiple files</p>
      )}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
      )}
    </div>
  );
```

**Pros**:

- Context-aware icons based on file types
- Rich file information display
- Visual feedback for selected state
- File size information

**Cons**:

- More complex logic
- Larger code footprint
- May be overkill for simple use cases

---

## Icon SVG Options

Here are the SVG icons used in the examples above:

### Upload Cloud Icon

```svg
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
</svg>
```

### Image Icon

```svg
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>
```

### Document Icon

```svg
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
```

### Paperclip Icon (Alternative)

```svg
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
</svg>
```

## Comparison Matrix

| Feature             | Option 1: Inline SVG        | Option 2: Drag & Drop     | Option 3: Compact Icon | Option 4: Enhanced Button |
| ------------------- | --------------------------- | ------------------------- | ---------------------- | ------------------------- |
| **Consistency**     | ✅ Matches existing buttons | ⚠️ Different pattern      | ✅ Matches edit button | ⚠️ New pattern            |
| **Space Usage**     | 🟡 Medium                   | ❌ Large                  | ✅ Minimal             | 🟡 Medium                 |
| **User Experience** | ✅ Familiar                 | ✅ Modern/Intuitive       | ⚠️ Less discoverable   | ✅ Rich feedback          |
| **Implementation**  | 🟡 Medium complexity        | ❌ High complexity        | ✅ Simple              | ❌ High complexity        |
| **Mobile Friendly** | ✅ Yes                      | ⚠️ Drag may not work      | ✅ Yes                 | ✅ Yes                    |
| **Accessibility**   | ✅ Good                     | 🟡 Needs keyboard support | ⚠️ Needs tooltip       | ✅ Good                   |

## Recommendations

### For Immediate Implementation (Best Balance)

**Option 1: Inline SVG Icon Button** is recommended because:

- Maintains consistency with existing form buttons
- Clean, professional appearance
- Easy to implement and maintain
- Good user experience
- Mobile-friendly

### For Enhanced User Experience

**Option 2: Drag & Drop Area** if you want to provide a modern, feature-rich upload experience:

- Great for users who frequently upload files
- Provides visual feedback
- Supports both click and drag interactions

### For Minimal Design

**Option 3: Compact Icon-Only Button** if space is at a premium:

- Matches the existing edit button pattern in FormNode
- Very clean and minimal
- Good for forms with many fields

## Implementation Notes

1. **State Management**: All options require additional React state to track selected files
2. **Form Integration**: The hidden input approach maintains compatibility with react-hook-form
3. **Styling**: All examples use existing Tailwind classes for consistency
4. **Accessibility**: Consider adding proper ARIA labels and keyboard navigation
5. **File Validation**: Consider adding client-side file type and size validation

## Next Steps

1. Choose your preferred option
2. Test the implementation in your development environment
3. Consider adding file validation and error handling
4. Test accessibility with screen readers
5. Verify mobile responsiveness
