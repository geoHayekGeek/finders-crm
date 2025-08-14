'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { requestPasswordReset } from '@/utils/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const watchedEmail = watch('email');

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
    };
  }, [checkTimeout]);

  // Check if user exists in the backend
  const checkUserExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setIsCheckingUser(true);
    setHasCheckedUser(true);
    try {
      const response = await fetch('http://localhost:10000/api/users/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserExists(data.exists);
        } else {
          // Handle backend error
          setUserExists(null);
          setError(data.message || 'Error checking user existence');
        }
      } else {
        // Handle HTTP error
        const errorData = await response.json().catch(() => ({}));
        setUserExists(null);
        setError(errorData.message || 'Failed to check user existence');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUserExists(null);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsCheckingUser(false);
    }
  };

  const onSubmit = async (data: ForgotPasswordForm) => {
    // Double-check that user exists before submitting
    if (userExists === false) {
      setError('No account found with this email address');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const response = await requestPasswordReset(data.email);
      if (response.success) {
        setIsEmailSent(true);
        setEmail(data.email);
      } else {
        setError(response.message || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if button should be disabled
  const isButtonDisabled = () => {
    return !isValid || isLoading || isCheckingUser || userExists === false || !hasCheckedUser;
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Check Your Email
              </h1>
              <p className="text-gray-600 mb-6">
                We've sent a 6-digit verification code to{' '}
                <span className="font-semibold text-gray-900">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mb-8">
                The code will expire in 10 minutes. If you don't see the email, check your spam folder.
              </p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 inline-block"
              >
                Enter Verification Code
              </Link>
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                onClick={() => setIsEmailSent(false)}
              >
                ← Back to forgot password
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </h1>
            <p className="text-gray-600">
              Enter your email address and we'll send you a verification code to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
                             <div className="relative forgot-password-input input-with-icon">
                 {!inputValue && (
                   <div className="mail-icon">
                     <Mail className="h-5 w-5 text-gray-400" />
                   </div>
                 )}
                 <input
                   {...register('email')}
                   type="email"
                   id="email"
                   value={inputValue}
                   onChange={(e) => {
                     const value = e.target.value;
                     setInputValue(value);
                     setValue('email', value, { shouldValidate: true });
                     
                     // Clear any existing timeout and error
                     if (checkTimeout) {
                       clearTimeout(checkTimeout);
                     }
                     setError(''); // Clear any previous errors
                     setHasCheckedUser(false); // Reset user check status
                     setUserExists(null); // Reset user existence status
                     
                     // Check if user exists after a delay
                     if (value && value.includes('@')) {
                       const newTimeout = setTimeout(() => {
                         checkUserExists(value);
                       }, 1000); // 1 second delay to reduce API calls
                       
                       setCheckTimeout(newTimeout);
                     } else {
                       setUserExists(null);
                       setHasCheckedUser(false);
                     }
                   }}
                   className={`block w-full pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                     errors.email
                       ? 'border-red-300 focus:ring-red-500 focus:border-red-500 error'
                       : 'border-gray-300'
                   }`}
                   placeholder="Enter your email"
                 />
               </div>
                             {errors.email && (
                 <p className="mt-2 text-sm text-red-600 flex items-center">
                   <AlertCircle className="h-4 w-4 mr-1" />
                   {errors.email.message}
                 </p>
               )}
               
               {/* User existence status */}
               {inputValue && inputValue.includes('@') && (
                 <div className="mt-2">
                   {isCheckingUser && (
                     <p className="text-sm text-blue-600 flex items-center">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                       Checking if user exists...
                     </p>
                   )}
                   {!isCheckingUser && userExists === false && (
                     <p className="text-sm text-red-600 flex items-center">
                       <AlertCircle className="h-4 w-4 mr-1" />
                       No account found with this email address
                     </p>
                   )}
                   {!isCheckingUser && userExists === true && (
                     <p className="text-sm text-green-600 flex items-center">
                       <CheckCircle className="h-4 w-4 mr-1" />
                       Account found! You can proceed with password reset
                     </p>
                   )}
                 </div>
               )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

                         <button
               type="submit"
               disabled={isButtonDisabled()}
               className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                 isButtonDisabled()
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
               }`}
             >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
