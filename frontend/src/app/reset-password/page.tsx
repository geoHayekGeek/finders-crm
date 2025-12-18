'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/utils/api';

const resetCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

type ResetCodeForm = z.infer<typeof resetCodeSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<ResetCodeForm>({
    resolver: zodResolver(resetCodeSchema),
    mode: 'onChange',
  });

  const watchedCode = watch('code');

  // Auto-advance input fields
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 6) {
      setValue('code', value, { shouldValidate: true });
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: ResetCodeForm) => {
    if (!email) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.verifyResetCode(email, data.code);
      if (response.success) {
        setIsCodeVerified(true);
        setSuccess('Code verified successfully!');
        // Redirect to password reset page after a short delay
        setTimeout(() => {
          router.push(`/new-password?email=${encodeURIComponent(email)}&code=${data.code}`);
        }, 1500);
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || resendCooldown > 0 || isResending) return;
    
    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.resendResetCode(email);
      if (response.success) {
        setSuccess('New verification code sent successfully!');
        setResendCooldown(60); // 1 minute cooldown
      } else {
        setError(response.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Request</h1>
            <p className="text-gray-600 mb-6">
              Please request a password reset from the forgot password page.
            </p>
            <Link
              href="/forgot-password"
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Go to Forgot Password
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isCodeVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Code Verified!
              </h1>
              <p className="text-gray-600 mb-6">
                Redirecting you to set your new password...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
              href="/forgot-password"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to forgot password
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enter Verification Code
            </h1>
            <p className="text-gray-600">
              We&apos;ve sent a 6-digit code to{' '}
              <span className="font-semibold text-gray-900">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
                             <div className="relative input-with-icon">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Lock className="h-5 w-5 text-gray-400" />
                 </div>
                 <input
                   {...register('code')}
                   type="text"
                   id="code"
                   maxLength={6}
                   onChange={handleCodeChange}
                   className={`block w-full py-3 border rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                     errors.code
                       ? 'border-red-300 focus:ring-red-500 focus:border-red-500 error'
                       : 'border-gray-300'
                   }`}
                   placeholder="000000"
                 />
               </div>
              {errors.code && (
                <p className="mt-2 text-sm text-red-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.code.message}
                </p>
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

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              </div>
            )}

                         <button
               type="submit"
               disabled={!isValid || isLoading}
               className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                 !isValid || isLoading
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
               }`}
             >
               {isLoading ? (
                 <div className="flex items-center justify-center">
                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                   Verifying...
                 </div>
               ) : (
                 'Verify Code'
               )}
             </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || isResending}
              className={`text-sm font-medium transition-colors duration-200 ${
                resendCooldown > 0 || isResending
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {resendCooldown > 0 ? (
                <span className="flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Resend in {resendCooldown}s
                </span>
              ) : isResending ? (
                <span className="flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </span>
              ) : (
                "Didn't receive the code? Resend"
              )}
            </button>
          </div>

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
