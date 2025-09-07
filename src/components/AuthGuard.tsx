// src/components/AuthGuard.tsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Mail, AlertTriangle } from 'lucide-react';
import { isFirebaseConfigured, firebaseConfigError } from '@/lib/firebase';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  // Show configuration error if Firebase is not set up
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md game-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold">Setup Required</CardTitle>
            <CardDescription className="text-left">
              Firebase configuration is missing. Please:
              <br /><br />
              1. Copy <code>.env.example</code> to <code>.env</code>
              <br />
              2. Add your Firebase project settings
              <br />
              3. Restart the development server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
              <strong>Error:</strong> {firebaseConfigError}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, loading, isAllowed, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold mb-2">Espey Pick'em</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md game-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Espey Pick'em</CardTitle>
            <CardDescription>
              NFL picks for Brady & Jenny
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={signInWithGoogle}
              className="w-full"
              variant="default"
            >
              <Mail className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md game-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold">Access Restricted</CardTitle>
            <CardDescription>
              This app is only available for Brady and Jenny. Your email ({user.email}) is not on the authorized list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => signInWithGoogle()}
              variant="outline"
              className="w-full"
            >
              Try Different Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};