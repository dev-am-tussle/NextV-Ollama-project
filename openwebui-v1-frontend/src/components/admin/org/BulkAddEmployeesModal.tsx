import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Loader from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { bulkInviteEmployees } from '@/services/invitations';
import { Upload, FileText, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { BulkFormErrors, BulkInvitationResponse } from '@/types/invitation';

interface BulkAddEmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedEmployee {
  line: number;
  name: string;
  email: string;
  department?: string;
  job_title?: string;
  isValid: boolean;
  error?: string;
}

export const BulkAddEmployeesModal: React.FC<BulkAddEmployeesModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<BulkFormErrors>({});
  const [bulkData, setBulkData] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<BulkInvitationResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleData = `John Doe, john.doe@company.com, Engineering, Software Developer
Jane Smith, jane.smith@company.com, Marketing, Marketing Manager
Bob Johnson, bob.johnson@company.com, Sales, Sales Representative`;

  const parseEmployeeData = (data: string): ParsedEmployee[] => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      const lineNumber = index + 1;

      if (parts.length < 2) {
        return {
          line: lineNumber,
          name: '',
          email: '',
          isValid: false,
          error: 'At least name and email are required'
        };
      }

      const [name, email, department, job_title] = parts;

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          line: lineNumber,
          name,
          email,
          department,
          job_title,
          isValid: false,
          error: 'Invalid email format'
        };
      }

      if (!name.trim()) {
        return {
          line: lineNumber,
          name,
          email,
          department,
          job_title,
          isValid: false,
          error: 'Name is required'
        };
      }

      return {
        line: lineNumber,
        name,
        email,
        department,
        job_title,
        isValid: true
      };
    });
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      setErrors({ general: 'Please select a CSV or Excel file (.csv, .xlsx, .xls)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors({ general: 'File size must be less than 5MB' });
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      if (fileExtension === 'csv') {
        const text = await file.text();
        parseAndSetCSVData(text);
      } else {
        // Handle Excel files
        await parseExcelFile(file);
      }
    } catch (error) {
      console.error('File processing error:', error);
      setErrors({ general: 'Failed to process file. Please check the format.' });
    } finally {
      setIsLoading(false);
    }
  };

  const parseAndSetCSVData = (csvText: string) => {
    // Parse CSV and convert to our text format
    const lines = csvText.trim().split('\n');
    const header = lines[0]?.toLowerCase();
    
    // Check if CSV has proper headers
    if (!header.includes('name') || !header.includes('email')) {
      setErrors({ general: 'CSV must have "name" and "email" columns' });
      return;
    }

    // Parse header to find column positions
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const deptIndex = headers.findIndex(h => h.includes('department') || h.includes('dept'));
    const jobIndex = headers.findIndex(h => h.includes('job') || h.includes('title') || h.includes('position'));

    // Convert CSV data to text format
    const textData = lines.slice(1)
      .map(line => {
        if (!line.trim()) return '';
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        const name = columns[nameIndex] || '';
        const email = columns[emailIndex] || '';
        const department = deptIndex >= 0 ? columns[deptIndex] || '' : '';
        const jobTitle = jobIndex >= 0 ? columns[jobIndex] || '' : '';
        
        return [name, email, department, jobTitle].filter(Boolean).join(', ');
      })
      .filter(Boolean)
      .join('\n');

    setBulkData(textData);
    setInputMethod('text');
  };

  const parseExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        setErrors({ general: 'Excel file is empty' });
        return;
      }
      
      // Check if first row has headers
      const headers = (jsonData[0] as string[]).map(h => (h || '').toString().toLowerCase());
      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));
      
      if (nameIndex === -1 || emailIndex === -1) {
        setErrors({ general: 'Excel file must have "Name" and "Email" columns' });
        return;
      }
      
      const deptIndex = headers.findIndex(h => h.includes('department') || h.includes('dept'));
      const jobIndex = headers.findIndex(h => h.includes('job') || h.includes('title') || h.includes('position'));
      
      // Convert Excel data to text format
      const textData = jsonData.slice(1)
        .map((row: any) => {
          if (!row || row.length === 0) return '';
          
          const name = (row[nameIndex] || '').toString().trim();
          const email = (row[emailIndex] || '').toString().trim();
          const department = deptIndex >= 0 ? (row[deptIndex] || '').toString().trim() : '';
          const jobTitle = jobIndex >= 0 ? (row[jobIndex] || '').toString().trim() : '';
          
          if (!name && !email) return ''; // Skip empty rows
          
          return [name, email, department, jobTitle].filter(Boolean).join(', ');
        })
        .filter(Boolean)
        .join('\n');

      setBulkData(textData);
      setInputMethod('text');
      
      toast({
        title: "Excel File Processed",
        description: `Successfully imported ${textData.split('\n').length} employees`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Excel parsing error:', error);
      setErrors({ general: 'Failed to parse Excel file. Please check the format.' });
    }
  };

  const downloadTemplate = () => {
    // Generate Excel template
    const templateData = [
      ['Name', 'Email', 'Department', 'Job Title'],
      ['John Doe', 'john.doe@company.com', 'Engineering', 'Software Developer'],
      ['Jane Smith', 'jane.smith@company.com', 'Marketing', 'Marketing Manager'],
      ['Bob Johnson', 'bob.johnson@company.com', 'Sales', 'Sales Representative'],
      ['Alice Williams', 'alice.williams@company.com', 'HR', 'HR Specialist']
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 20 }, // Name
      { width: 30 }, // Email
      { width: 20 }, // Department
      { width: 25 }  // Job Title
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, 'employee_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Excel template has been downloaded successfully",
      duration: 3000,
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      processFile(file);
    }
  };

  const resetFileUpload = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateData = (): boolean => {
    const newErrors: BulkFormErrors = {};

    if (!bulkData.trim()) {
      newErrors.general = 'Please enter employee data';
      setErrors(newErrors);
      return false;
    }

    const parsedData = parseEmployeeData(bulkData);
    const invalidLines = parsedData.filter(emp => !emp.isValid);

    if (invalidLines.length > 0) {
      newErrors.lines = invalidLines.map(emp => ({
        line: emp.line,
        error: emp.error || 'Invalid data'
      }));
      setErrors(newErrors);
      return false;
    }

    // Check for duplicate emails
    const emails = parsedData.map(emp => emp.email.toLowerCase());
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    if (duplicateEmails.length > 0) {
      newErrors.general = `Duplicate emails found: ${duplicateEmails.join(', ')}`;
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateData()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const parsedData = parseEmployeeData(bulkData);
      const validEmployees = parsedData.filter(emp => emp.isValid);

      const invitations = validEmployees.map(emp => ({
        name: emp.name,
        email: emp.email,
        department: emp.department || undefined,
        job_title: emp.job_title || undefined,
        custom_message: `Welcome to our organization, ${emp.name}!`
      }));

      const response = await bulkInviteEmployees({
        invitations,
        expires_in_days: 7
      });

      setResults(response);
      setShowResults(true);

      toast({
        title: "Bulk Invitations Processed",
        description: `${response.data.created} invitations sent successfully, ${response.data.failed} failed`,
        duration: 5000,
      });

      onSuccess?.();

    } catch (error) {
      console.error('Failed to send bulk invitations:', error);
      
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to send invitations. Please try again.'
      });

      toast({
        title: "Error",
        description: "Failed to send bulk invitations. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setBulkData('');
      setErrors({});
      setShowResults(false);
      setResults(null);
      resetFileUpload();
      setInputMethod('text');
      onOpenChange(false);
    }
  };

  const handleStartOver = () => {
    setBulkData('');
    setErrors({});
    setShowResults(false);
    setResults(null);
    resetFileUpload();
    setInputMethod('text');
  };

  const handleInputChange = (value: string) => {
    setBulkData(value);
    
    // Clear errors when user starts typing
    if (errors.general || errors.lines) {
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showResults ? 'Invitation Results' : 'Add Multiple Employees'}
          </DialogTitle>
        </DialogHeader>

        {showResults && results ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {results.data.created}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {results.data.failed}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {results.data.total}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {results.data.results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Successful Invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.data.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="text-sm">{result.email}</span>
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          Sent
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {results.data.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Failed Invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.data.errors.map((error, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{error.email}</div>
                          <div className="text-xs text-red-600 dark:text-red-400">{error.error}</div>
                        </div>
                        <Badge variant="destructive">
                          Failed
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleStartOver}>
                Add More Employees
              </Button>
              <Button onClick={handleCancel}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'text' | 'file')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Text Input
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload CSV or Excel File</Label>
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-muted/50 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <div className="text-sm text-muted-foreground mb-2">
                      Drag and drop your file here, or click to browse
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      Choose File
                    </Button>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetFileUpload}
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Download className="h-4 w-4" />
                    <span>Need a template?</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={downloadTemplate}
                      className="p-0 h-auto text-sm"
                    >
                      Download Excel template
                    </Button>
                    <span className="text-muted-foreground">or</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/employee_template.csv';
                        link.download = 'employee_template.csv';
                        link.click();
                      }}
                      className="p-0 h-auto text-sm"
                    >
                      CSV template
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>File Requirements:</strong>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-1">
                      <li>CSV or Excel format (.csv, .xlsx, .xls)</li>
                      <li>Must have "Name" and "Email" columns</li>
                      <li>Optional: "Department" and "Job Title" columns</li>
                      <li>Maximum file size: 5MB</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-data">
                    Employee Data
                  </Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Enter employee information, one per line in the format:<br />
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      Name, Email, Department, Job Title
                    </code>
                  </div>
                  <Textarea
                    id="bulk-data"
                    placeholder={`Example:\n${sampleData}`}
                    value={bulkData}
                    onChange={(e) => handleInputChange(e.target.value)}
                    disabled={isLoading}
                    className={`min-h-[200px] font-mono text-sm ${errors.lines ? 'border-red-500' : ''}`}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {errors.lines && errors.lines.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Validation Errors:</div>
                    {errors.lines.map((lineError, index) => (
                      <div key={index} className="text-sm">
                        Line {lineError.line}: {lineError.error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              <div className="font-medium mb-1">Tips:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Name and Email are required fields</li>
                <li>Department and Job Title are optional</li>
                <li>Each employee should be on a separate line</li>
                <li>Separate fields with commas</li>
              </ul>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !bulkData.trim()}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Add Employees'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};