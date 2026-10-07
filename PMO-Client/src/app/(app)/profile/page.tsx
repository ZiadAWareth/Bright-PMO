"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User } from "@/types/user";
import { Spinner } from "@/components/ui/spinner";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const userIdRef = useRef<number | null>(null); // Use a ref to keep track of user ID
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Authentication is handled by HTTP-only cookies, no need to check localStorage
        const response = await axios.get("/api/auth/me", {
          // Cookies are automatically sent with the request
        });

        console.log("API Response from /api/auth/me:", response.data);

        if (response.data && response.data.user) {
          const userData = response.data.user;
          console.log("User data:", userData);
          console.log("User ID:", userData.user_id);
          
          // Store the user ID in the ref
          userIdRef.current = userData.user_id;
          
          setUser(userData);
          setFormData({
            firstName: userData.account?.first_name || "",
            lastName: userData.account?.last_name || "",
            email: userData.email || "",
            phone: userData.account?.phone_number || "",
            department: userData.account?.department || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        } else {
          toast.error("Invalid user data received");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      // Authentication is handled by HTTP-only cookies

      // Use the userId from the ref
      const userId = userIdRef.current;
      console.log("Current user ID for API call:", userId);
      
      if (!userId) {
        toast.error("User ID is not available. Please reload the page.");
        setUpdating(false);
        return;
      }

      const response = await axios.put(
        `/api/users/${userId}`,
        {
          account: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phone,
            department: formData.department,
          },
        }
      );

      if (response.status === 200) {
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    setUpdating(true);
    
    try {
      // Authentication is handled by HTTP-only cookies

      // Use the userId from the ref
      const userId = userIdRef.current;
      
      if (!userId) {
        toast.error("User ID is not available. Please reload the page.");
        setUpdating(false);
        return;
      }

      const response = await axios.put(
        `/api/users/${userId}/password`,
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }
      );

      if (response.status === 200) {
        toast.success("Password updated successfully");
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Failed to update password:", error);
      toast.error("Failed to update password. Please check your current password.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="User Profile">
        <div className="flex items-center justify-center h-64">
          <Spinner size={48} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Profile">
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="info" className="w-full">
          <TabsList variant="line">
            <TabsTrigger value="info">Personal Information</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="First Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email"
                      disabled
                    />
                    <p className="text-xs text-muted">
                      Email cannot be changed. Please contact administrator.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Department"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updating}>
                      {updating ? "Updating..." : "Update Profile"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Change your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Current Password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder="New Password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm Password"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updating}>
                      {updating ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 