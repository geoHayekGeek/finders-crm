'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/utils/api';

const newPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type NewPasswordForm = z.infer<typeof newPasswordSchema>;

export default function NewPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams?.get('email') || null;
  const code = searchParams?.get('code') || null;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<NewPasswordForm>({
    resolver: zodResolver(newPasswordSchema),
    mode: 'onChange',
  });

  const watchedPassword = watch('newPassword');

  const onSubmit = async (data: NewPasswordForm) => {
    if (!email || !code) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.resetPassword(email, code, data.newPassword);
      if (response.success) {
        setIsPasswordReset(true);
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Request</h1>
            <p className="text-gray-600 mb-6">
              Please complete the verification process first.
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

  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Password Reset Successfully!
              </h1>
              <p className="text-gray-600 mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Redirecting you to the login page...
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Set New Password
            </h1>
            <p className="text-gray-600">
              Enter your new password below. Make sure it&apos;s secure and memorable.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
                             <div className="relative input-with-icon">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Lock className="h-5 w-5 text-gray-400" />
                 </div>
                 <input
                   {...register('newPassword')}
                   type={showPassword ? 'text' : 'password'}
                   id="newPassword"
                   className={`block w-full py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                     errors.newPassword
                       ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                       : 'border-gray-300'
                   }`}
                   placeholder="Enter new password"
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
                 >
                   {showPassword ? (
                     <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                   ) : (
                     <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                   )}
                 </button>
               </div>
              {errors.newPassword && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.newPassword.message}
                </p>
              )}
              <div className="mt-2">
                <div className="flex space-x-2">
                  <div className={`h-2 flex-1 rounded-full ${
                    watchedPassword && watchedPassword.length >= 8 ? 'bg-green-400' : 'bg-gray-200'
                  }`}></div>
                  <div className={`h-2 flex-1 rounded-full ${
                    watchedPassword && /[a-z]/.test(watchedPassword) ? 'bg-green-400' : 'bg-gray-200'
                  }`}></div>
                  <div className={`h-2 flex-1 rounded-full ${
                    watchedPassword && /[A-Z]/.test(watchedPassword) ? 'bg-green-400' : 'bg-gray-200'
                  }`}></div>
                  <div className={`h-2 flex-1 rounded-full ${
                    watchedPassword && /\d/.test(watchedPassword) ? 'bg-green-400' : 'bg-gray-200'
                  }`}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password strength indicator
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
                             <div className="relative input-with-icon">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Lock className="h-5 w-5 text-gray-400" />
                 </div>
                 <input
                   {...register('confirmPassword')}
                   type={showConfirmPassword ? 'text' : 'password'}
                   id="confirmPassword"
                   className={`block w-full py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                     errors.confirmPassword
                       ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                       : 'border-gray-300'
                   }`}
                   placeholder="Confirm new password"
                 />
                 <button
                   type="button"
                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
                 >
                   {showConfirmPassword ? (
                     <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                   ) : (
                     <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                   )}
                 </button>
               </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.confirmPassword.message}
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
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
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
