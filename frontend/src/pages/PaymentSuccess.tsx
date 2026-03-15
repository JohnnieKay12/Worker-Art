import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { bookingApi } from "@/services/api";
import { CheckCircle, Loader } from "lucide-react";

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const reference = searchParams.get("reference");

                if (!reference) {
                navigate("/dashboard");
                return;
                }

                const response = await bookingApi.verifyPayment(reference);

                if (response.success) {
                setSuccess(true);
                }

            }catch (error) {
                console.error("Verification error:", error);
            } finally {
                setLoading(false);
            }
        };

        verifyPayment();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Loader className="animate-spin h-12 w-12" />
                <p className="mt-4 text-gray-500">Verifying payment...</p>
            </div>
        );
    }

    if (!success) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-red-500 text-lg">
                    Payment verification failed
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <CheckCircle className="text-green-600 h-16 w-16" />

            <h1 className="text-2xl font-bold mt-4">
                Payment Successful
            </h1>

            <p className="text-gray-500 mt-2">
                Your booking payment was successful.
            </p>

            <button
                onClick={() => navigate("/dashboard")}
                className="mt-6 bg-black text-white px-6 py-3 rounded-lg"
            >
                Go to Dashboard
            </button>
        </div>
    );
}