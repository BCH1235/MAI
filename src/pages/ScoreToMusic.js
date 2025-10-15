// 파일 최상단: 모든 import는 최상단에 위치
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useMusicContext } from '../context/MusicContext';
import {
    Typography,
    Button,
    CircularProgress,
    Box,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

// ErrorFallback 컴포넌트 정의 (ErrorBoundary용)
const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <Box sx={{ color: 'red', p: 4, textAlign: 'center' }}>
        <Typography variant="h6">오류가 발생했습니다.</Typography>
        <Typography variant="body2">{error.message}</Typography>
        <Button onClick={resetErrorBoundary} sx={{ mt: 2 }} variant="contained">
            다시 시도
        </Button>
    </Box>
);

const ScoreToMusic = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [outputFormat, setOutputFormat] = useState('midi');
    const navigate = useNavigate();
    const { actions } = useMusicContext();

    // PDF 파일 선택
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            setPdfFile(file);
            setFileName(file.name);
        } else {
            alert("PDF 파일만 업로드할 수 있습니다.");
            setPdfFile(null);
            setFileName('');
        }
    };

    // 변환 요청
    const handleSubmit = async () => {
        if (!pdfFile) {
            alert("악보 PDF 파일을 업로드해주세요.");
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('score', pdfFile);
        formData.append('format', outputFormat);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/process-score', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '악보 처리에 실패했습니다.');
            }

            const data = await response.json();
            if (!data.success || !data.result) {
                throw new Error('파일 생성에 실패했습니다.');
            }

            actions.setResult?.({
                convertedMusic: {
                    id: data.result.id,
                    title: data.result.title,
                    audioUrl: data.result.audioUrl,
                    format: outputFormat.toUpperCase(),
                    genres: data.result.genres || ['Classical'],
                    duration: data.result.duration || 180,
                    createdAt: new Date().toISOString(),
                    type: 'score-conversion',
                    originalFile: fileName,
                }
            });

            navigate('/result');

        } catch (error) {
            console.error("Error processing score:", error);
            alert(`악보 처리 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100vh',
                bgcolor: '#000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 4,
            }}
        >
            <Box
                sx={{
                    width: { xs: '90%', sm: '600px' },
                    bgcolor: '#1A1A1A',
                    borderRadius: 3,
                    p: { xs: 3, sm: 4 },
                    textAlign: 'center',
                    boxShadow: '0 0 20px rgba(80, 227, 194, 0.2)',
                    color: '#FFF'
                }}
            >
                <Typography variant="h4" gutterBottom>
                    악보 변환하기
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: '#CCC' }}>
                    PDF 악보를 업로드하고 원하는 형식으로 변환해보세요.
                </Typography>

                <Box
                    sx={{
                        border: '2px dashed #555',
                        borderRadius: '10px',
                        p: 4,
                        mb: 3,
                        cursor: 'pointer',
                        '&:hover': { borderColor: '#50E3C2', bgcolor: '#111' },
                    }}
                    onClick={() => document.getElementById('pdf-upload').click()}
                >
                    <UploadFileIcon sx={{ fontSize: 60, color: '#777' }} />
                    <Typography sx={{ mt: 1 }}>
                        {fileName || '클릭하여 PDF 파일을 선택하세요'}
                    </Typography>
                    <input
                        type="file"
                        id="pdf-upload"
                        hidden
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                </Box>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: '#CCC' }}>출력 형식</InputLabel>
                    <Select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                        label="출력 형식"
                        sx={{
                            color: '#FFF',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#50E3C2' },
                            '& .MuiSvgIcon-root': { color: '#FFF' }
                        }}
                    >
                        <MenuItem value="midi">MIDI</MenuItem>
                        <MenuItem value="mp3">MP3</MenuItem>
                        <MenuItem value="wav">WAV</MenuItem>
                        <MenuItem value="musicxml">MusicXML</MenuItem>
                    </Select>
                </FormControl>

                <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={isLoading || !pdfFile}
                    sx={{
                        minWidth: '200px',
                        bgcolor: '#50E3C2',
                        color: '#000',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#40D9B8' }
                    }}
                >
                    {isLoading ? <CircularProgress size={24} /> : `${outputFormat.toUpperCase()} 변환`}
                </Button>

                {isLoading && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" sx={{ color: '#AAA' }}>
                            악보를 분석하고 {outputFormat.toUpperCase()} 파일을 생성하는 중입니다...
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>
                            PDF → MusicXML → {outputFormat.toUpperCase()} 변환 중 (약 1-2분 소요)
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// 최종 export 시 ErrorBoundary 적용
const WrappedScoreToMusic = () => (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ScoreToMusic />
    </ErrorBoundary>
);

export default WrappedScoreToMusic;
