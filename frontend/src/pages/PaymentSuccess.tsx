import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);

    const reference = searchParams.get("reference");

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                if (!reference) return;

                const response = await paymentApi.verify(reference);

                if (response.success) {
                    setSuccess(true);
                }
            } catch (error) {
                console.error("Payment verification failed:", error);
            } finally {
                setLoading(false);
            }
        };

        verifyPayment();
    }, [reference]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Verifying payment...</p>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-screen">
            <Card className="w-[400px]">
                <CardContent className="p-6 text-center space-y-4">
                    {success ? (
                        <>
                            <h2 className="text-xl font-bold text-green-600">
                                Payment Successful 🎉
                            </h2>
                            <p>Your booking payment has been confirmed.</p>
                            <Button onClick={() => navigate("/dashboard/bookings")}>
                                View My Bookings
                            </Button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-red-600">
                                Payment Failed
                            </h2>
                            <p>Please try again.</p>
                            <Button onClick={() => navigate("/dashboard/bookings")}>
                                Go Back
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}