import React from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  id?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  accept = "image/*", 
  id = "file-upload" 
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
      <p className="text-gray-600 mb-4">Drag & drop your image here or click to browse</p>
      
      {/* File Input */}
      <div className="mb-4">
        <input 
          type="file" 
          onChange={handleFileChange} 
          id={id} 
          className="hidden" 
          accept={accept}
        />
        <label htmlFor={id} className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors inline-block">
          Choose Image
        </label>
      </div>
    </div>
  );
};

export default FileUpload;