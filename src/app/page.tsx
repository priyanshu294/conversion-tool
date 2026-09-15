"use client";

import React, { useState, useRef } from "react";
import { 
  Button, 
  Typography, 
  Container, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from "@mui/material";
import { 
  CloudUpload as CloudUploadIcon, 
  PictureAsPdf as PdfIcon, 
  Download as DownloadIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  RestartAlt as ResetIcon,
  Description as DocIcon
} from "@mui/icons-material";
import { generatePDF } from "@/utils/pdfGenerator";
import { convertWordToPdf, convertPdfToWord } from "@/utils/documentConverter";

type ToolType = 'photoToPdf' | 'wordToPdf' | 'pdfToWord';

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolType>('photoToPdf');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("converted_file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: ToolType) => {
    setActiveTool(newValue);
    handleReset();
  };

  const getToolConfig = () => {
    switch (activeTool) {
      case 'photoToPdf':
        return {
          title: "Photo to PDF Converter",
          accept: "image/jpeg, image/png",
          fileIcon: <ImageIcon color="primary" fontSize="small" />,
          actionText: "Convert to PDF",
          downloadExt: ".pdf"
        };
      case 'wordToPdf':
        return {
          title: "Word to PDF Converter",
          accept: ".doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileIcon: <DocIcon color="info" fontSize="small" />,
          actionText: "Convert to PDF",
          downloadExt: ".pdf"
        };
      case 'pdfToWord':
        return {
          title: "PDF to Word Converter",
          accept: "application/pdf",
          fileIcon: <PdfIcon color="error" fontSize="small" />,
          actionText: "Convert to Word",
          downloadExt: ".docx"
        };
    }
  };

  const toolConfig = getToolConfig();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    setResultBlobUrl(null);
    
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      
      // Basic validation based on active tool
      const hasInvalid = selectedFiles.some(file => {
        if (activeTool === 'photoToPdf') return !['image/jpeg', 'image/png'].includes(file.type);
        if (activeTool === 'wordToPdf') return !file.name.match(/\.(doc|docx)$/i);
        if (activeTool === 'pdfToWord') return file.type !== 'application/pdf';
        return false;
      });

      if (hasInvalid) {
        setError(`Invalid file type detected. Please upload valid files for the ${toolConfig.title}.`);
        return;
      }

      setFiles(prev => [...prev, ...selectedFiles]);
      setSuccessMsg("Files uploaded successfully! Ready for conversion.");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      if (newFiles.length === 0) {
        setSuccessMsg(null);
        setResultBlobUrl(null);
      } else {
        setResultBlobUrl(null);
        setSuccessMsg("Files updated. Ready for conversion.");
      }
      return newFiles;
    });
  };

  const handleReset = () => {
    setFiles([]);
    setError(null);
    setSuccessMsg(null);
    setResultBlobUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError("No files to convert. Please upload files first.");
      return;
    }

    setIsConverting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let blob: Blob;
      
      // Set the download name based on the first file
      const firstFileName = files[0].name;
      const baseName = firstFileName.substring(0, firstFileName.lastIndexOf('.')) || firstFileName;
      setDownloadName(`${baseName}${toolConfig.downloadExt}`);

      // Perform conversion based on active tool
      // Note: for document converters, we're taking the first file only to keep it simple, 
      // but photoToPdf can take multiple.
      if (activeTool === 'photoToPdf') {
        blob = await generatePDF(files);
      } else if (activeTool === 'wordToPdf') {
        blob = await convertWordToPdf(files[0]);
      } else {
        blob = await convertPdfToWord(files[0]);
      }

      const url = URL.createObjectURL(blob);
      setResultBlobUrl(url);
      setSuccessMsg("Conversion successful! You can now download your file.");
    } catch (err) {
      console.error(err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Container maxWidth="md" className="py-12 min-h-screen flex flex-col justify-center">
      <Box className="text-center mb-10">
        <Typography variant="h3" component="h1" gutterBottom className="font-bold text-gray-900 drop-shadow-sm">
          Conversion Tool
        </Typography>
        <Typography variant="subtitle1" className="text-gray-800 font-medium drop-shadow-sm">
          Easily convert your files locally in your browser.
        </Typography>
      </Box>

      <Paper elevation={6} className="p-8 rounded-2xl bg-white/95 backdrop-blur-sm">
        
        {/* Tool Selector Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={activeTool} 
            onChange={handleTabChange} 
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Photo to PDF" value="photoToPdf" />
            <Tab label="Word to PDF" value="wordToPdf" />
            <Tab label="PDF to Word" value="pdfToWord" />
          </Tabs>
        </Box>

        {/* Header with Reset Button */}
        <Box className="flex justify-between items-center mb-6">
          <Typography variant="h6" className="text-gray-800 font-bold">
            {toolConfig.title}
          </Typography>
          {files.length > 0 && (
            <Tooltip title="Start Over">
              <Button 
                variant="text" 
                color="inherit" 
                startIcon={<ResetIcon />} 
                onClick={handleReset}
                className="text-gray-600 hover:text-gray-900"
              >
                Reset
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* Alerts for feedback */}
        {error && (
          <Alert severity="error" className="mb-6 shadow-sm rounded-lg">
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" className="mb-6 shadow-sm rounded-lg">
            {successMsg}
          </Alert>
        )}

        <Box className="flex flex-col md:flex-row gap-4 justify-center items-center mb-8">
          {/* Upload Button */}
          <input
            type="file"
            // For word/pdf tools we currently handle 1 file at a time effectively in UI
            multiple={activeTool === 'photoToPdf'} 
            accept={toolConfig.accept}
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            aria-label="Upload files"
          />
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            className="w-full md:w-auto py-3 px-6 rounded-lg border-2 hover:border-primary-main"
          >
            Upload Files
          </Button>

          {/* Convert Button */}
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={isConverting ? <CircularProgress size={20} color="inherit" /> : (activeTool === 'pdfToWord' ? <DocIcon /> : <PdfIcon />)}
            onClick={handleConvert}
            disabled={files.length === 0 || isConverting}
            className="w-full md:w-auto py-3 px-6 rounded-lg shadow-md hover:shadow-lg"
          >
            {isConverting ? "Converting..." : toolConfig.actionText}
          </Button>

          {/* Download Button */}
          <Button
            component="a"
            variant="contained"
            color="success"
            size="large"
            startIcon={<DownloadIcon />}
            disabled={!resultBlobUrl}
            href={resultBlobUrl || ""}
            download={downloadName}
            className="w-full md:w-auto py-3 px-6 rounded-lg shadow-md hover:shadow-lg"
          >
            Download {toolConfig.downloadExt.toUpperCase().substring(1)}
          </Button>
        </Box>

        {/* File List */}
        {files.length > 0 && (
          <Box className="mt-8">
            <Typography variant="subtitle1" className="mb-3 font-semibold text-gray-700">
              Selected {files.length === 1 ? 'File' : 'Files'} ({files.length})
            </Typography>
            <Paper variant="outlined" className="max-h-64 overflow-y-auto rounded-lg border-gray-200">
              <List disablePadding>
                {files.map((file, index) => (
                  <ListItem 
                    key={`${file.name}-${index}`}
                    divider={index !== files.length - 1}
                    className="hover:bg-gray-50 transition-colors"
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(index)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemIcon className="min-w-[40px]">
                      {toolConfig.fileIcon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={file.name} 
                      secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} 
                      className="truncate"
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
