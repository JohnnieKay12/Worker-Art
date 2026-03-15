import { CheckCircle } from "lucide-react";

type Props = {
    status: string;
    paymentStatus?: string;
};

const steps = [
    { id: "pending", label: "Requested" },
    { id: "accepted", label: "Accepted" },
    { id: "paid", label: "Paid" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
];

export default function BookingProgress({ status, paymentStatus }: Props) {
    const getCurrentStep = () => {
        if (status === "pending") return 0;
        if (status === "accepted" && paymentStatus !== "paid") return 1;
        if (paymentStatus === "paid" && status === "accepted") return 2;
        if (status === "in_progress") return 3;
        if (status === "completed") return 4;
        return 0;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="w-full mt-6">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index <= currentStep;

                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center relative">

                            {/* Line */}
                            {index !== steps.length - 1 && (
                                <div
                                className={`absolute top-4 left-1/2 w-full h-1 ${
                                    index < currentStep ? "bg-green-500" : "bg-gray-200"
                                }`}
                                />
                            )}

                            {/* Circle */}
                            <div
                                className={`z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                                isCompleted ? "bg-green-500 text-white" : "bg-gray-200"
                                }`}
                            >
                                {isCompleted ? (
                                <CheckCircle size={16} />
                                ) : (
                                <span className="text-xs">{index + 1}</span>
                                )}
                            </div>

                            {/* Label */}
                            <p className="text-xs mt-2 text-center">{step.label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}